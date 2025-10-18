import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const templates = await prisma.dietTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: {
            meals: {
              orderBy: { order: 'asc' },
              include: {
                items: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    const counts = await Promise.all(
      templates.map((template) =>
        prisma.nutritionProgram.count({
          where: {
            isActive: true,
            programData: {
              path: ['templateId'],
              equals: template.id,
            },
          },
        }),
      ),
    )

    const data = templates.map((template, index) => ({
      id: template.id,
      name: template.name,
      goal: template.goal,
      description: template.description,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      assignedClients: counts[index] ?? 0,
      days: template.days.map((day) => ({
        id: day.id,
        order: day.order,
        title: day.title,
        notes: day.notes,
        meals: day.meals.map((meal) => ({
          id: meal.id,
          order: meal.order,
          title: meal.title,
          items: meal.items.map((item) => ({
            id: item.id,
            order: item.order,
            content: item.content,
          })),
        })),
      })),
    }))

    return NextResponse.json({ templates: data })
  } catch (error) {
    console.error('Trainer diet templates fetch error:', error)
    return NextResponse.json({ error: 'Diyet şablonları alınamadı' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, goal, description, days } = body

    if (!name || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { error: 'Program adı ve gün listesi zorunludur' },
        { status: 400 },
      )
    }

    const created = await prisma.dietTemplate.create({
      data: {
        name,
        goal: goal ?? null,
        description: description ?? null,
        days: {
          create: days.map((day: any, dayIndex: number) => ({
            order: day.order ?? dayIndex + 1,
            title:
              typeof day.title === 'string' && day.title.trim()
                ? day.title.trim()
                : `${dayIndex + 1}. Gün`,
            notes: day.notes ?? null,
            meals:
              Array.isArray(day.meals) && day.meals.length > 0
                ? {
                    create: day.meals.map((meal: any, mealIndex: number) => ({
                      order: meal.order ?? mealIndex + 1,
                      title:
                        typeof meal.title === 'string' && meal.title.trim()
                          ? meal.title.trim()
                          : `Öğün ${mealIndex + 1}`,
                      items:
                        Array.isArray(meal.items) && meal.items.length > 0
                          ? {
                              create: meal.items.map((item: any, itemIndex: number) => ({
                                order: item.order ?? itemIndex + 1,
                                content: String(item.content ?? '')
                                  .trim()
                                  .slice(0, 500),
                              })),
                            }
                          : undefined,
                    })),
                  }
                : undefined,
          })),
        },
      },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: {
            meals: {
              orderBy: { order: 'asc' },
              include: {
                items: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ template: created }, { status: 201 })
  } catch (error) {
    console.error('Trainer diet template create error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu isimde bir diyet şablonu zaten mevcut' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Diyet şablonu oluşturulamadı' }, { status: 500 })
  }
}
