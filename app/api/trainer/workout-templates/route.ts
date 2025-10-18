import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ProgramData = {
  templateId?: string
  [key: string]: unknown
}

const extractTemplateId = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null) return null
  const templateId = (value as ProgramData).templateId
  if (typeof templateId !== 'string') return null
  const trimmed = templateId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET() {
  try {
    const templates = await prisma.workoutTemplate.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: { exerciseTemplate: true }
            }
          }
        }
      }
    })

    const templateIds = new Set(templates.map((template) => template.id))
    const assignmentCounts: Record<string, number> = {}

    if (templateIds.size > 0) {
      const programs = await prisma.workoutProgram.findMany({
        select: {
          programData: true
        }
      })

      for (const program of programs) {
        const templateId = extractTemplateId(program.programData)
        if (templateId && templateIds.has(templateId)) {
          assignmentCounts[templateId] = (assignmentCounts[templateId] ?? 0) + 1
        }
      }
    }

    const data = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      duration: template.duration,
      difficulty: template.difficulty,
      muscleGroups: template.muscleGroups,
      createdAt: template.createdAt,
      assignedClients: assignmentCounts[template.id] ?? 0,
      days: template.days.map((day) => ({
        id: day.id,
        order: day.order,
        label: day.label,
        videoUrl: day.videoUrl,
        notes: day.notes,
        exercises: day.exercises.map((exercise) => ({
          id: exercise.id,
          exerciseTemplateId: exercise.exerciseTemplateId,
          order: exercise.order,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          weight: exercise.weight,
          notes: exercise.notes,
          exerciseTemplate: exercise.exerciseTemplate
        }))
      }))
    }))

    return NextResponse.json({ templates: data })
  } catch (error) {
    console.error('Trainer workout templates fetch error:', error)
    return NextResponse.json({ error: 'Program şablonları alınamadı' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      duration,
      difficulty,
      muscleGroups,
      days
    } = body

    if (!name || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json({ error: 'Program adı ve gün listesi zorunludur' }, { status: 400 })
    }

    const created = await prisma.workoutTemplate.create({
      data: {
        name,
        description,
        duration,
        difficulty,
        muscleGroups: muscleGroups ?? [],
        days: {
          create: days.map((day: any, dayIndex: number) => ({
            order: day.order ?? dayIndex + 1,
            label: typeof day.label === 'string' && day.label.trim() ? day.label.trim() : `${dayIndex + 1}. Gün`,
            videoUrl: day.videoUrl ?? null,
            notes: day.notes ?? null,
            exercises: day.exercises && Array.isArray(day.exercises)
              ? {
                  create: day.exercises.map((exercise: any, exerciseIndex: number) => ({
                    exerciseTemplateId: exercise.exerciseTemplateId,
                    order: exercise.order ?? exerciseIndex + 1,
                    sets: exercise.sets ?? null,
                    reps: exercise.reps ?? null,
                    rest: exercise.rest ?? null,
                    weight: exercise.weight ?? null,
                    notes: exercise.notes ?? null
                  }))
                }
              : undefined
          }))
        }
      },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: { exerciseTemplate: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ template: created }, { status: 201 })
  } catch (error) {
    console.error('Trainer workout template create error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu isimde bir program şablonu zaten mevcut' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Program şablonu oluşturulamadı' }, { status: 500 })
  }
}
