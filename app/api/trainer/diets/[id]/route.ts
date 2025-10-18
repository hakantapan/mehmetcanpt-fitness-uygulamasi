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
    const { name, goal, description, days } = body

    if (!name || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { error: 'Program adı ve gün listesi zorunludur' },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.dietTemplateMealItem.deleteMany({
        where: {
          meal: {
            is: {
              dietDay: {
                dietTemplateId: templateId,
              },
            },
          },
        },
      })

      await tx.dietTemplateMeal.deleteMany({
        where: {
          dietDay: {
            dietTemplateId: templateId,
          },
        },
      })

      await tx.dietTemplateDay.deleteMany({
        where: { dietTemplateId: templateId },
      })

      const updatedTemplate = await tx.dietTemplate.update({
        where: { id: templateId },
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
                                  content: String(item.content ?? '').trim().slice(0, 500),
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

      const activePrograms = await tx.nutritionProgram.findMany({
        where: {
          isActive: true,
          programData: {
            path: ['templateId'],
            equals: templateId,
          },
        },
      })

      if (activePrograms.length > 0) {
        const programPayload = {
          templateId: updatedTemplate.id,
          name: updatedTemplate.name,
          description: updatedTemplate.description,
          goal: updatedTemplate.goal,
          days: updatedTemplate.days.map((day) => ({
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
        }

        await Promise.all(
          activePrograms.map((program) =>
            tx.nutritionProgram.update({
              where: { id: program.id },
              data: {
                title: updatedTemplate.name,
                description: updatedTemplate.description,
                programData: JSON.parse(JSON.stringify(programPayload)),
              },
            }),
          ),
        )
      }

      return updatedTemplate
    })

    return NextResponse.json({ template: updated })
  } catch (error) {
    console.error('Trainer diet template update error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Diyet şablonu bulunamadı' }, { status: 404 })
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Bu isimde bir diyet şablonu zaten mevcut' },
          { status: 409 },
        )
      }
    }

    return NextResponse.json({ error: 'Diyet şablonu güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const templateId = params.id

  if (!templateId) {
    return NextResponse.json({ error: 'Şablon kimliği gerekli' }, { status: 400 })
  }

  try {
    await prisma.dietTemplate.delete({
      where: { id: templateId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer diet template delete error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Diyet şablonu bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Diyet şablonu silinemedi' }, { status: 500 })
  }
}
