import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

const parseStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

export async function PUT(request: Request, { params }: RouteParams) {
  const exerciseId = params.id

  if (!exerciseId) {
    return NextResponse.json({ error: 'Egzersiz kimliği gerekli' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
      name,
      category,
      equipment,
      difficulty,
      instructions,
      targetMuscles,
      videoUrl,
      tips,
      safetyNotes,
      variations
    } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Egzersiz adı zorunludur' }, { status: 400 })
    }

    const updated = await prisma.exerciseTemplate.update({
      where: { id: exerciseId },
      data: {
        name: name.trim(),
        category: category?.trim() || null,
        equipment: equipment?.trim() || null,
        difficulty: difficulty?.trim() || null,
        instructions: instructions?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        targetMuscles: parseStringArray(targetMuscles),
        tips: tips?.trim() || null,
        safetyNotes: safetyNotes?.trim() || null,
        variations: parseStringArray(variations)
      }
    })

    return NextResponse.json({ exercise: updated })
  } catch (error) {
    console.error('Trainer exercise update error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Egzersiz bulunamadı' }, { status: 404 })
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Bu isimde bir egzersiz zaten mevcut' }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Egzersiz güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const exerciseId = params.id

  if (!exerciseId) {
    return NextResponse.json({ error: 'Egzersiz kimliği gerekli' }, { status: 400 })
  }

  try {
    await prisma.exerciseTemplate.delete({
      where: { id: exerciseId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer exercise delete error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Egzersiz bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Egzersiz silinemedi' }, { status: 500 })
  }
}
