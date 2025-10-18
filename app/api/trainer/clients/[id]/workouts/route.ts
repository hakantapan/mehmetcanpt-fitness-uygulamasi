import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { sendProgramAssignedEmail } from '@/lib/mail'

type RouteParams = {
  params: {
    id: string
  }
}

const formatAssignment = (
  program: {
    id: string
    title: string
    createdAt: Date
    isActive: boolean
  },
  templateId: string | null
) => ({
  id: program.id,
  name: program.title,
  templateId,
  assignedDate: program.createdAt.toISOString(),
  status: program.isActive ? 'active' : 'inactive'
})

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const templateId = typeof body?.templateId === 'string' ? body.templateId.trim() : ''
    if (!templateId) {
      return NextResponse.json({ error: 'Şablon seçmeniz gerekiyor' }, { status: 400 })
    }

    let relation = await prisma.trainerClient.findFirst({
      where: {
        trainerId,
        clientId,
        isActive: true
      }
    })

    if (!relation) {
      relation = await prisma.trainerClient.upsert({
        where: {
          trainerId_clientId: {
            trainerId,
            clientId
          }
        },
        update: {
          isActive: true
        },
        create: {
          trainerId,
          clientId,
          isActive: true
        }
      })
    }

    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: {
                exerciseTemplate: true
              }
            }
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Program şablonu bulunamadı' }, { status: 404 })
    }

    const programData = {
      templateId: template.id,
      name: template.name,
      description: template.description,
      duration: template.duration,
      difficulty: template.difficulty,
      muscleGroups: template.muscleGroups,
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
          exercise: {
            id: exercise.exerciseTemplate.id,
            name: exercise.exerciseTemplate.name,
            category: exercise.exerciseTemplate.category,
            difficulty: exercise.exerciseTemplate.difficulty,
            videoUrl: exercise.exerciseTemplate.videoUrl,
            targetMuscles: exercise.exerciseTemplate.targetMuscles
          }
        }))
      }))
    }

    const program = await prisma.$transaction(async (tx) => {
      await tx.workoutProgram.updateMany({
        where: {
          clientId,
          trainerId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      return tx.workoutProgram.create({
        data: {
          trainerId,
          clientId,
          title: template.name,
          description: template.description,
          duration: template.duration,
          programData,
          isActive: true
        }
      })
    })

    try {
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      const trainer = await prisma.user.findUnique({
        where: { id: trainerId },
        select: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          email: true,
        },
      })

      if (client?.email) {
        const name = client.profile
          ? `${client.profile.firstName ?? ''} ${client.profile.lastName ?? ''}`.trim()
          : client.email
        const trainerName = trainer?.profile
          ? `${trainer.profile.firstName ?? ''} ${trainer.profile.lastName ?? ''}`.trim()
          : trainer?.email ?? null

        await sendProgramAssignedEmail(
          client.email,
          {
            name,
            programType: 'Antrenman',
            trainerName,
          },
          {
            actorId: trainerId,
            actorEmail: trainer?.email ?? session.user.email ?? null,
            context: {
              clientId,
              trainerId,
              programId: program.id,
              templateId: template.id,
            },
          },
        )
      }
    } catch (error) {
      console.error('Workout program mail error:', error)
    }

    return NextResponse.json({ assignment: formatAssignment(program, template.id) }, { status: 201 })
  } catch (error) {
    console.error('Workout assignment create error:', error)
    return NextResponse.json({ error: 'Program atanamadı' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const url = new URL(request.url)
    const programId = url.searchParams.get('programId')
    if (!programId) {
      return NextResponse.json({ error: 'Program seçilmedi' }, { status: 400 })
    }

    const program = await prisma.workoutProgram.findUnique({
      where: { id: programId }
    })

    if (!program || program.clientId !== clientId) {
      return NextResponse.json({ error: 'Program bulunamadı' }, { status: 404 })
    }

    if (program.trainerId !== trainerId) {
      return NextResponse.json({ error: 'Bu programı yönetme yetkiniz yok' }, { status: 403 })
    }

    await prisma.workoutProgram.update({
      where: { id: programId },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Workout assignment delete error:', error)
    return NextResponse.json({ error: 'Program kaldırılamadı' }, { status: 500 })
  }
}
