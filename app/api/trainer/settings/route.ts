import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

const parseString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const formatTrainer = (
  user: Prisma.UserGetPayload<{ include: { profile: true } }>,
  stats: { totalClients: number; activeClients: number },
) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  firstName: user.profile?.firstName ?? '',
  lastName: user.profile?.lastName ?? '',
  phone: user.profile?.phone ?? null,
  address: user.profile?.address ?? null,
  avatar: user.profile?.avatar ?? null,
  stats,
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const trainerId = session.user.id

    const [user, totalClients, activeClients] = await Promise.all([
      prisma.user.findUnique({
        where: { id: trainerId },
        include: { profile: true },
      }),
      prisma.trainerClient.count({ where: { trainerId } }),
      prisma.trainerClient.count({ where: { trainerId, isActive: true } }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'Eğitmen bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      trainer: formatTrainer(user, { totalClients, activeClients }),
    })
  } catch (error) {
    console.error('Trainer settings fetch error:', error)
    return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 })
  }
}

type UpdateTrainerPayload = {
  firstName?: unknown
  lastName?: unknown
  phone?: unknown
  address?: unknown
  avatar?: unknown
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const trainerId = session.user.id
    const body: UpdateTrainerPayload = await request.json().catch(() => ({}))

    const firstName = parseString(body.firstName)
    const lastName = parseString(body.lastName)
    const phone = parseString(body.phone)
    const address = parseString(body.address)
    const avatar = parseString(body.avatar)

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Ad ve soyad zorunludur' }, { status: 400 })
    }

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: trainerId },
      update: {
        firstName,
        lastName,
        phone,
        address,
        avatar,
      },
      create: {
        userId: trainerId,
        firstName,
        lastName,
        phone,
        address,
        avatar,
      },
    })

    const [user, totalClients, activeClients] = await Promise.all([
      prisma.user.findUnique({
        where: { id: trainerId },
        include: { profile: true },
      }),
      prisma.trainerClient.count({ where: { trainerId } }),
      prisma.trainerClient.count({ where: { trainerId, isActive: true } }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'Eğitmen bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      trainer: formatTrainer(
        { ...user, profile: updatedProfile },
        { totalClients, activeClients },
      ),
    })
  } catch (error) {
    console.error('Trainer settings update error:', error)
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 })
  }
}
