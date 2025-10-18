import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { calculateExpiry } from '@/lib/subscription'
import { sendPackageAssignedEmail } from '@/lib/mail'
import type { PackageStatus } from '@prisma/client'

type RouteParams = {
  params: {
    id: string
  }
}

const ACTIVE_STATUSES: PackageStatus[] = ['ACTIVE', 'PENDING']

const isValidDate = (value: Date) => !Number.isNaN(value.getTime())

async function ensureTrainerClientRelation(trainerId: string, clientId: string) {
  const relation = await prisma.trainerClient.findFirst({
    where: {
      trainerId,
      clientId,
    },
  })

  if (relation) {
    return relation
  }

  return prisma.trainerClient.upsert({
    where: {
      trainerId_clientId: {
        trainerId,
        clientId,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      trainerId,
      clientId,
      isActive: true,
    },
  })
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const packageId = typeof body?.packageId === 'string' ? body.packageId.trim() : ''
    const startDateInput = typeof body?.startDate === 'string' ? body.startDate.trim() : ''
    const paymentReference =
      typeof body?.reference === 'string' && body.reference.trim().length > 0
        ? body.reference.trim()
        : 'MANUAL_ASSIGNMENT'

    if (!packageId) {
      return NextResponse.json({ error: 'Paket seçimi zorunludur' }, { status: 400 })
    }

    await ensureTrainerClientRelation(trainerId, clientId)

    const fitnessPackage = await prisma.fitnessPackage.findUnique({
      where: { id: packageId },
    })

    if (!fitnessPackage) {
      return NextResponse.json({ error: 'Paket bulunamadı' }, { status: 404 })
    }

    const now = new Date()
    const parsedStart = startDateInput ? new Date(startDateInput) : now
    const startsAt = isValidDate(parsedStart) ? parsedStart : now
    const isFutureStart = startsAt.getTime() > now.getTime()
    const status: PackageStatus = isFutureStart ? 'PENDING' : 'ACTIVE'
    const effectiveStartsAt = startsAt
    const expiresAt = calculateExpiry(fitnessPackage.durationInDays, new Date(effectiveStartsAt))

    const purchase = await prisma.$transaction(async (tx) => {
      await tx.packagePurchase.updateMany({
        where: {
          userId: clientId,
          status: { in: ACTIVE_STATUSES },
          expiresAt: { gt: now },
        },
        data: {
          status: 'EXPIRED',
          cancelledAt: now,
        },
      })

      return tx.packagePurchase.create({
        data: {
          userId: clientId,
          packageId: fitnessPackage.id,
          status,
          purchasedAt: now,
          startsAt: effectiveStartsAt,
          expiresAt,
          paymentReference,
        },
        include: {
          package: true,
        },
      })
    })

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (client?.email && purchase.package) {
      const clientName = client.profile
        ? `${client.profile.firstName ?? ''} ${client.profile.lastName ?? ''}`.trim()
        : client.email
      const trainerName = trainer?.profile
        ? `${trainer.profile.firstName ?? ''} ${trainer.profile.lastName ?? ''}`.trim()
        : trainer?.email ?? null

      await sendPackageAssignedEmail(
        client.email,
        {
          name: clientName,
          packageName: purchase.package.name,
          durationInDays: purchase.package.durationInDays,
          price: purchase.package.price,
          currency: purchase.package.currency,
          trainerName,
          startsAt: effectiveStartsAt,
        },
        {
          actorId: trainerId,
          actorEmail: session.user.email ?? trainer?.email ?? null,
          context: {
            clientId,
            trainerId,
            packageId: purchase.packageId,
            purchaseId: purchase.id,
            status: purchase.status,
          },
          source: 'subscription',
        },
      )
    }

    await prisma.adminLog.create({
      data: {
        level: 'AUDIT',
        message: 'Manuel paket ataması yapıldı',
        actorId: trainerId,
        actorEmail: session.user.email ?? null,
        source: 'subscription',
        context: {
          clientId,
          trainerId,
          packageId: purchase.packageId,
          purchaseId: purchase.id,
          status: purchase.status,
          startsAt: purchase.startsAt,
          expiresAt: purchase.expiresAt,
        },
      },
    })

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        status: purchase.status,
        packageName: purchase.package?.name ?? null,
        price: purchase.package?.price ?? null,
        currency: purchase.package?.currency ?? null,
        durationInDays: purchase.package?.durationInDays ?? null,
        startsAt: purchase.startsAt.toISOString(),
        expiresAt: purchase.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Trainer package assign error:', error)
    return NextResponse.json({ error: 'Paket atanamadı' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const url = new URL(request.url)
    const purchaseId = url.searchParams.get('purchaseId')
    if (!purchaseId) {
      return NextResponse.json({ error: 'Paket satın alımı belirtilmedi' }, { status: 400 })
    }

    const purchase = await prisma.packagePurchase.findUnique({
      where: { id: purchaseId },
      include: {
        package: true,
      },
    })

    if (!purchase || purchase.userId !== clientId) {
      return NextResponse.json({ error: 'Paket kaydı bulunamadı' }, { status: 404 })
    }

    const relation = await prisma.trainerClient.findFirst({
      where: {
        trainerId,
        clientId,
      },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Bu danışanı yönetme yetkiniz yok' }, { status: 403 })
    }

    const now = new Date()

    const updated = await prisma.packagePurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        expiresAt: now,
      },
      include: {
        package: true,
      },
    })

    await prisma.adminLog.create({
      data: {
        level: 'AUDIT',
        message: 'Manuel paket iptali yapıldı',
        actorId: trainerId,
        actorEmail: session.user.email ?? null,
        source: 'subscription',
        context: {
          clientId,
          trainerId,
          packageId: updated.packageId,
          purchaseId: updated.id,
          previousStatus: purchase.status,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer package cancel error:', error)
    return NextResponse.json({ error: 'Paket iptal edilemedi' }, { status: 500 })
  }
}
