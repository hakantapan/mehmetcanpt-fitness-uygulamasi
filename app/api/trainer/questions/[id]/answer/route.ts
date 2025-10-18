import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { sendQuestionAnsweredEmail } from '@/lib/mail'

type RouteParams = {
  params: {
    id: string
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const questionId = params.id
    if (!questionId) {
      return NextResponse.json({ error: 'Geçersiz soru' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const answer = typeof body?.answer === 'string' ? body.answer.trim() : ''

    if (!answer) {
      return NextResponse.json({ error: 'Yanıt metni boş olamaz' }, { status: 400 })
    }

    const question = await prisma.supportQuestion.findFirst({
      where: {
        id: questionId,
        trainerId: session.user.id
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Soru bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.supportQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        status: 'Cevaplanmis',
        answeredAt: new Date(),
        answeredById: session.user.id
      },
      include: {
        client: {
          include: {
            profile: true
          }
        }
      }
    })

    try {
      if (updated.client?.email) {
        const clientName = updated.client.profile
          ? `${updated.client.profile.firstName ?? ''} ${updated.client.profile.lastName ?? ''}`.trim()
          : updated.client.email

        await sendQuestionAnsweredEmail(
          updated.client.email,
          {
            name: clientName,
            question: updated.question,
            answer,
          },
          {
            actorId: session.user.id,
            actorEmail: session.user.email ?? null,
            context: {
              questionId: updated.id,
              trainerId: session.user.id,
            },
          },
        )
      }
    } catch (error) {
      console.error('Question answered mail error:', error)
    }

    return NextResponse.json({
      question: {
        id: updated.id,
        subject: updated.subject,
        category: updated.category,
        priority: updated.priority,
        status: updated.status,
        question: updated.question,
        answer: updated.answer,
        answeredAt: updated.answeredAt ? updated.answeredAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        client: {
          id: updated.clientId,
          name: updated.client.profile
            ? `${updated.client.profile.firstName} ${updated.client.profile.lastName}`.trim()
            : updated.client.email
        }
      }
    })
  } catch (error) {
    console.error('Trainer question answer error:', error)
    return NextResponse.json({ error: 'Yanıt gönderilemedi' }, { status: 500 })
  }
}
