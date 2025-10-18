import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

export async function POST(_request: Request, { params }: RouteParams) {
  const exerciseId = params.id

  if (!exerciseId) {
    return NextResponse.json({ error: 'Egzersiz kimliği gerekli' }, { status: 400 })
  }

  try {
    const exercise = await prisma.exerciseTemplate.findUnique({
      where: { id: exerciseId }
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Egzersiz bulunamadı' }, { status: 404 })
    }

    const baseName = `${exercise.name} Kopya`
    let duplicateName = baseName
    let attempt = 1

    while (
      await prisma.exerciseTemplate.findUnique({
        where: { name: duplicateName },
        select: { id: true }
      })
    ) {
      attempt += 1
      duplicateName = `${baseName} ${attempt}`
    }

    const duplicated = await prisma.exerciseTemplate.create({
      data: {
        name: duplicateName,
        category: exercise.category,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        videoUrl: exercise.videoUrl,
        targetMuscles: exercise.targetMuscles,
        tips: exercise.tips,
        safetyNotes: exercise.safetyNotes,
        variations: exercise.variations
      }
    })

    return NextResponse.json({ exercise: duplicated }, { status: 201 })
  } catch (error) {
    console.error('Trainer exercise duplicate error:', error)
    return NextResponse.json({ error: 'Egzersiz kopyalanamadı' }, { status: 500 })
  }
}
