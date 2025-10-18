import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type RouteParams = {
  params: {
    id: string
  }
}

const parseJsonArray = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item)
  }

  return []
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id

    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const relation = await prisma.trainerClient.findFirst({
      where: {
        trainerId,
        clientId
      }
    })

    if (!relation) {
      return NextResponse.json({ error: 'Bu danışan size bağlı değil' }, { status: 403 })
    }

    const ptForm = await prisma.pTForm.findFirst({
      where: { userId: clientId },
      orderBy: { createdAt: 'desc' }
    })

    if (!ptForm) {
      return NextResponse.json({ error: 'PT formu bulunamadı' }, { status: 404 })
    }

    const bodyPhotos = parseJsonArray(ptForm.bodyPhotos)
    const equipmentPhotos = parseJsonArray(ptForm.equipmentPhotos)

    return NextResponse.json({
      ptForm: {
        id: ptForm.id,
        createdAt: ptForm.createdAt.toISOString(),
        updatedAt: ptForm.updatedAt.toISOString(),
        healthConditions: ptForm.healthConditions,
        injuries: ptForm.injuries,
        medications: ptForm.medications,
        workoutLocation: ptForm.workoutLocation,
        equipmentAvailable: ptForm.equipmentAvailable,
        workoutDaysPerWeek: ptForm.workoutDaysPerWeek,
        experience: ptForm.experience,
        mealFrequency: ptForm.mealFrequency,
        dietRestrictions: ptForm.dietRestrictions,
        jobDetails: ptForm.jobDetails,
        trainingExpectations: ptForm.trainingExpectations,
        sportHistory: ptForm.sportHistory,
        lastTrainingProgram: ptForm.lastTrainingProgram,
        emergencyContactName: ptForm.emergencyContactName,
        emergencyContactPhone: ptForm.emergencyContactPhone,
        specialRequests: ptForm.specialRequests,
        agreedToTerms: ptForm.agreedToTerms,
        bodyPhotos,
        equipmentPhotos
      }
    })
  } catch (error) {
    console.error('Trainer PT form fetch error:', error)
    return NextResponse.json({ error: 'PT formu alınamadı' }, { status: 500 })
  }
}
