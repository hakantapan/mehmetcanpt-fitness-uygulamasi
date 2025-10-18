import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const defaultExercises = [
  {
    name: 'Bench Press',
    category: 'Göğüs',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions: "Sırt üstü yatarak barbell'i kontrollü şekilde göğse indirin ve yukarı itin.",
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    targetMuscles: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps'],
    tips: 'Ayaklarınızı yere sıkıca bastırın, sırtınızı hafif kavisli tutun',
    safetyNotes: 'Mutlaka spotter ile çalışın, ağırlığı kontrol edin',
    variations: ['Incline Bench Press', 'Decline Bench Press', 'Dumbbell Bench Press']
  },
  {
    name: 'Squat',
    category: 'Bacak',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions: 'Ayaklar omuz genişliğinde, kalçayı geriye iterek çömelin ve dik konuma dönün.',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    tips: 'Göğsü dik tutun, ağırlığı topuklarda hissedin',
    safetyNotes: 'Dizleri içe kaçırmayın, sırt düz kalmalı',
    variations: ['Front Squat', 'Goblet Squat', 'Bulgarian Split Squat']
  },
  {
    name: 'Deadlift',
    category: 'Sırt',
    equipment: 'Barbell',
    difficulty: 'İleri',
    instructions: "Barbell'i yerden kaldırarak dik duruşa geçin. Kalça ve dizleri aynı anda açın.",
    videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
    targetMuscles: ['Erector Spinae', 'Glutes', 'Hamstrings', 'Traps'],
    tips: 'Barı vücuda yakın tutun, omuzlar barın üzerinde olsun',
    safetyNotes: 'Sırt düz kalmalı, ani hareketlerden kaçının',
    variations: ['Romanian Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift']
  },
  {
    name: 'Push-up',
    category: 'Göğüs',
    equipment: 'Vücut Ağırlığı',
    difficulty: 'Başlangıç',
    instructions: 'Plank pozisyonunda vücudu yukarı aşağı hareket ettirin. Eller omuz genişliğinde olmalı.',
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    targetMuscles: ['Pectoralis Major', 'Triceps', 'Anterior Deltoid', 'Core'],
    tips: 'Vücut düz bir çizgi halinde, core kasılı tutun',
    safetyNotes: 'Boyun nötr pozisyonda, kalça çökmesin',
    variations: ['Diamond Push-up', 'Wide Push-up', 'Incline Push-up']
  },
  {
    name: 'Pull-up',
    category: 'Sırt',
    equipment: 'Pull-up Bar',
    difficulty: 'İleri',
    instructions: 'Bardan asılı durumda vücudu yukarı çekin. Çene bar seviyesine gelene kadar çekin.',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    targetMuscles: ['Latissimus Dorsi', 'Biceps', 'Rhomboids'],
    tips: 'Core kasılı tutun, hareketi kontrollü yapın',
    safetyNotes: 'Omuz eklemini ısıtın, ani hareketlerden kaçının',
    variations: ['Chin-up', 'Wide Grip Pull-up', 'Assisted Pull-up']
  },
  {
    name: 'Overhead Press',
    category: 'Omuz',
    equipment: 'Barbell',
    difficulty: 'Orta',
    instructions: "Barbell'i omuz seviyesinden başın üzerine itin. Core kasılı tutun.",
    videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    targetMuscles: ['Anterior Deltoid', 'Medial Deltoid', 'Triceps', 'Core'],
    tips: 'Kalça ileri itmeyin, dikey hareket yapın',
    safetyNotes: 'Boyun nötr, sırt düz kalmalı',
    variations: ['Dumbbell Press', 'Seated Press', 'Push Press']
  }
]

async function ensureSeedExercises() {
  const count = await prisma.exerciseTemplate.count()
  if (count > 0) return

  await Promise.all(
    defaultExercises.map((exercise) =>
      prisma.exerciseTemplate.create({
        data: exercise
      })
    )
  )
}

export async function GET(request: Request) {
  try {
    await ensureSeedExercises()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase()
    const category = searchParams.get('category')

    const exercises = await prisma.exerciseTemplate.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { category: { contains: search, mode: 'insensitive' } },
                  { equipment: { contains: search, mode: 'insensitive' } }
                ]
              }
            : {},
          category && category !== 'all'
            ? {
                category: {
                  equals: category,
                  mode: 'insensitive'
                }
              }
            : {}
        ]
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ exercises })
  } catch (error) {
    console.error('Trainer exercises fetch error:', error)
    return NextResponse.json({ error: 'Egzersiz listesi alınamadı' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const parsedTargetMuscles = Array.isArray(targetMuscles)
      ? targetMuscles.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    const parsedVariations = Array.isArray(variations)
      ? variations.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    const created = await prisma.exerciseTemplate.create({
      data: {
        name: name.trim(),
        category: category?.trim() || null,
        equipment: equipment?.trim() || null,
        difficulty: difficulty?.trim() || null,
        instructions: instructions?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        targetMuscles: parsedTargetMuscles,
        tips: tips?.trim() || null,
        safetyNotes: safetyNotes?.trim() || null,
        variations: parsedVariations
      }
    })

    return NextResponse.json({ exercise: created }, { status: 201 })
  } catch (error) {
    console.error('Trainer exercise create error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir egzersiz zaten mevcut' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Egzersiz oluşturulamadı' }, { status: 500 })
  }
}
