import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

export async function POST(_request: Request, { params }: RouteParams) {
  const templateId = params.id

  if (!templateId) {
    return NextResponse.json({ error: 'Şablon kimliği gerekli' }, { status: 400 })
  }

  try {
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
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

    if (!template) {
      return NextResponse.json({ error: 'Program şablonu bulunamadı' }, { status: 404 })
    }

    const baseName = `${template.name} Kopya`
    let duplicateName = baseName
    let attempt = 1

    // Ensure unique name by appending attempt counter if needed
    while (
      await prisma.workoutTemplate.findUnique({
        where: { name: duplicateName },
        select: { id: true }
      })
    ) {
      attempt += 1
      duplicateName = `${baseName} ${attempt}`
    }

    const duplicated = await prisma.workoutTemplate.create({
      data: {
        name: duplicateName,
        description: template.description,
        duration: template.duration,
        difficulty: template.difficulty,
        muscleGroups: template.muscleGroups,
        days: {
          create: template.days.map((day) => ({
            order: day.order,
            label: day.label,
            videoUrl: day.videoUrl,
            notes: day.notes,
            exercises: {
              create: day.exercises.map((exercise) => ({
                exerciseTemplateId: exercise.exerciseTemplateId,
                order: exercise.order,
                sets: exercise.sets,
                reps: exercise.reps,
                rest: exercise.rest,
                weight: exercise.weight,
                notes: exercise.notes
              }))
            }
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

    return NextResponse.json({ template: duplicated }, { status: 201 })
  } catch (error) {
    console.error('Trainer workout template duplicate error:', error)
    return NextResponse.json({ error: 'Program şablonu kopyalanamadı' }, { status: 500 })
  }
}
