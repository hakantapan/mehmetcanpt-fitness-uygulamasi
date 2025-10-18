import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const genderLabels: Record<string, string> = {
  Erkek: 'Erkek',
  Kadin: 'Kadın',
  Diger: 'Diğer'
}

const fitnessGoalLabels: Record<string, string> = {
  KiloVerme: 'Kilo Verme',
  KiloAlma: 'Kilo Alma',
  KasKazanma: 'Kas Kazanma',
  GenelSaglik: 'Genel Sağlık'
}

const activityLevelLabels: Record<string, string> = {
  Dusuk: 'Düşük',
  Orta: 'Orta',
  Yuksek: 'Yüksek'
}

function mapUserToClient(user: Prisma.UserGetPayload<{ include: { profile: true } }>) {
  if (!user) return null

  const profile = user.profile

  return {
    id: user.id,
    name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email,
    email: user.email,
    phone: profile?.phone ?? null,
    age: profile?.age ?? null,
    gender: profile?.gender ? genderLabels[profile.gender] ?? profile.gender : null,
    joinDate: user.createdAt.toISOString(),
    program: profile?.fitnessGoal ? fitnessGoalLabels[profile.fitnessGoal] ?? profile.fitnessGoal : null,
    activityLevel: profile?.activityLevel ? activityLevelLabels[profile.activityLevel] ?? profile.activityLevel : null,
    status: user.isActive ? 'active' : 'inactive',
    progress: null,
    currentWeight: profile?.weight ?? null,
    targetWeight: profile?.targetWeight ?? null,
    startWeight: null,
    lastActivity: user.updatedAt.toISOString(),
    avatar: profile?.avatar ?? null,
    notes: null,
    paymentStatus: 'unknown',
    package: null,
    packagePrice: null,
    packageEndDate: null,
    assignedWorkout: null,
    assignedDiet: null,
    assignedSupplements: [],
    questions: []
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { isActive } = await request.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive alanı zorunludur' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        isActive
      },
      include: {
        profile: true
      }
    })

    const client = mapUserToClient(updatedUser)

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Trainer client status update error:', error)
    return NextResponse.json({ error: 'Danışan durumu güncellenemedi' }, { status: 500 })
  }
}
