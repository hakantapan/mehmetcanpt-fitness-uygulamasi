import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const templateId = params.id

  if (!templateId) {
    return NextResponse.json({ error: 'Şablon kimliği gerekli' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { name, description, duration, difficulty, muscleGroups, days } = body

    if (!name || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { error: 'Program adı ve gün listesi zorunludur' },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.workoutTemplateDay.deleteMany({
        where: { workoutTemplateId: templateId }
      })

      return tx.workoutTemplate.update({
        where: { id: templateId },
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
    })

    return NextResponse.json({ template: updated })
  } catch (error) {
    console.error('Trainer workout template update error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Program şablonu bulunamadı' }, { status: 404 })
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu isimde bir program şablonu zaten mevcut' }, { status: 409 })
      }
    }

    return NextResponse.json({ error: 'Program şablonu güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const templateId = params.id

  if (!templateId) {
    return NextResponse.json({ error: 'Şablon kimliği gerekli' }, { status: 400 })
  }

  try {
    await prisma.workoutTemplate.delete({
      where: { id: templateId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer workout template delete error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Program şablonu bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Program şablonu silinemedi' }, { status: 500 })
  }
}
