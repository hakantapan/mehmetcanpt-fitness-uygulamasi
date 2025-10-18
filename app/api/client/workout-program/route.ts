import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getActivePackagePurchase } from '@/lib/subscription'

type ProgramDayExercise = {
  id?: string
  exerciseTemplateId?: string
  order?: number
  sets?: number | null
  reps?: string | null
  rest?: number | null
  weight?: string | null
  notes?: string | null
  exercise?: {
    id?: string
    name?: string
    category?: string | null
    difficulty?: string | null
    videoUrl?: string | null
    targetMuscles?: string[]
  }
}

type ProgramDay = {
  id?: string
  order?: number
  label?: string
  videoUrl?: string | null
  notes?: string | null
  exercises?: ProgramDayExercise[]
}

type ProgramData = {
  templateId?: string | null
  name?: string
  description?: string | null
  duration?: number | null
  difficulty?: string | null
  muscleGroups?: string[]
  days?: ProgramDay[]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(userId)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const program = await prisma.workoutProgram.findFirst({
      where: {
        clientId: userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!program) {
      return NextResponse.json({ program: null }, { status: 200 })
    }

    const programData = (program.programData ?? {}) as ProgramData

    return NextResponse.json({
      program: {
        id: program.id,
        title: program.title,
        description: program.description,
        assignedAt: program.createdAt,
        templateId: programData.templateId ?? null,
        duration: programData.duration ?? null,
        difficulty: programData.difficulty ?? null,
        muscleGroups: Array.isArray(programData.muscleGroups) ? programData.muscleGroups : [],
        days: Array.isArray(programData.days)
          ? programData.days
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((day) => ({
                id: day.id ?? null,
                order: day.order ?? 0,
                label: day.label ?? null,
                videoUrl: day.videoUrl ?? null,
                notes: day.notes ?? null,
                exercises: Array.isArray(day.exercises)
                  ? day.exercises
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((exercise) => ({
                        id: exercise.id ?? null,
                        order: exercise.order ?? null,
                        sets: exercise.sets ?? null,
                        reps: exercise.reps ?? null,
                        rest: exercise.rest ?? null,
                        weight: exercise.weight ?? null,
                        notes: exercise.notes ?? null,
                        exercise: exercise.exercise
                          ? {
                              id: exercise.exercise.id ?? null,
                              name: exercise.exercise.name ?? null,
                              category: exercise.exercise.category ?? null,
                              difficulty: exercise.exercise.difficulty ?? null,
                              videoUrl: exercise.exercise.videoUrl ?? null,
                              targetMuscles: Array.isArray(exercise.exercise.targetMuscles)
                                ? exercise.exercise.targetMuscles
                                : [],
                            }
                          : null,
                      }))
                  : [],
              }))
          : [],
      },
    })
  } catch (error) {
    console.error('Client workout program fetch error:', error)
    return NextResponse.json({ error: 'Antrenman programı alınamadı' }, { status: 500 })
  }
}
