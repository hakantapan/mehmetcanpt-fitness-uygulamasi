import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getActivePackagePurchase } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

type ProgramMealItem = {
  id?: string
  order?: number
  content?: string
}

type ProgramMeal = {
  id?: string
  order?: number
  title?: string
  items?: ProgramMealItem[]
}

type ProgramDay = {
  id?: string
  order?: number
  title?: string
  notes?: string | null
  meals?: ProgramMeal[]
}

type ProgramData = {
  templateId?: string | null
  name?: string
  description?: string | null
  goal?: string | null
  generalNotes?: string | null
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

    const program = await prisma.nutritionProgram.findFirst({
      where: {
        clientId: userId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!program) {
      return NextResponse.json({ program: null }, { status: 200 })
    }

    const programData = (program.programData ?? {}) as ProgramData

    return NextResponse.json({
      program: {
        id: program.id,
        title: program.title,
        description: program.description ?? programData.description ?? null,
        goal: programData.goal ?? null,
        assignedAt: program.createdAt,
        templateId: programData.templateId ?? null,
        generalNotes: program.generalNotes ?? programData.generalNotes ?? null,
        days: Array.isArray(programData.days)
          ? programData.days
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((day, dayIndex) => ({
                id: day.id ?? null,
                order: day.order ?? dayIndex + 1,
                title: day.title ?? `${dayIndex + 1}. Gün`,
                notes: day.notes ?? null,
                meals: Array.isArray(day.meals)
                  ? day.meals
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((meal, mealIndex) => ({
                        id: meal.id ?? null,
                        order: meal.order ?? mealIndex + 1,
                        title: meal.title ?? `Öğün ${mealIndex + 1}`,
                        items: Array.isArray(meal.items)
                          ? meal.items
                              .slice()
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                              .map((item, itemIndex) => ({
                                id: item.id ?? null,
                                order: item.order ?? itemIndex + 1,
                                content: item.content ?? ''
                              }))
                          : []
                      }))
                  : []
              }))
          : []
      }
    })
  } catch (error) {
    console.error('Client nutrition program fetch error:', error)
    return NextResponse.json({ error: 'Beslenme programı alınamadı' }, { status: 500 })
  }
}
