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
    const template = await prisma.dietTemplate.findUnique({
      where: { id: templateId },
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

    if (!template) {
      return NextResponse.json({ error: 'Diyet şablonu bulunamadı' }, { status: 404 })
    }

    const baseName = `${template.name} Kopya`
    let duplicateName = baseName
    let attempt = 1

    while (
      await prisma.dietTemplate.findUnique({
        where: { name: duplicateName },
        select: { id: true },
      })
    ) {
      attempt += 1
      duplicateName = `${baseName} ${attempt}`
    }

    const duplicated = await prisma.dietTemplate.create({
      data: {
        name: duplicateName,
        goal: template.goal,
        description: template.description,
        days: {
          create: template.days.map((day) => ({
            order: day.order,
            title: day.title,
            notes: day.notes,
            meals: {
              create: day.meals.map((meal) => ({
                order: meal.order,
                title: meal.title,
                items: {
                  create: meal.items.map((item) => ({
                    order: item.order,
                    content: item.content,
                  })),
                },
              })),
            },
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

    return NextResponse.json({ template: duplicated }, { status: 201 })
  } catch (error) {
    console.error('Trainer diet template duplicate error:', error)
    return NextResponse.json({ error: 'Diyet şablonu kopyalanamadı' }, { status: 500 })
  }
}
