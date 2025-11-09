import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import type { QuestionCategory, QuestionPriority } from '@prisma/client'
import { sendSupportTicketNotification } from '@/lib/mail'

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  Antrenman: 'Antrenman',
  Beslenme: 'Beslenme',
  Supplement: 'Supplement',
  Genel: 'Genel'
}

const PRIORITY_LABELS: Record<QuestionPriority, string> = {
  Dusuk: 'Düşük',
  Orta: 'Orta',
  Yuksek: 'Yüksek'
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const questions = await prisma.supportQuestion.findMany({
      where: {
        clientId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        trainer: {
          include: {
            profile: true
          }
        }
      }
    })

    const data = questions.map((question) => ({
      id: question.id,
      subject: question.subject,
      category: question.category,
      categoryLabel: CATEGORY_LABELS[question.category],
      priority: question.priority,
      priorityLabel: PRIORITY_LABELS[question.priority],
      status: question.status,
      question: question.question,
      answer: question.answer,
      answeredAt: question.answeredAt ? question.answeredAt.toISOString() : null,
      createdAt: question.createdAt.toISOString(),
      attachments: Array.isArray(question.attachments) ? question.attachments : [],
      trainer: question.trainer
        ? {
            id: question.trainerId,
            name: question.trainer.profile
              ? `${question.trainer.profile.firstName} ${question.trainer.profile.lastName}`.trim()
              : question.trainer.email
          }
        : null
    }))

    // İstatistikleri hesapla
    const answeredCount = questions.filter(q => q.answer && q.status === 'Cevaplanmis').length
    const pendingCount = questions.filter(q => !q.answer && (q.status === 'Yeni' || q.status === 'Beklemede')).length

    return NextResponse.json({ 
      questions: data,
      stats: {
        answered: answeredCount,
        pending: pendingCount,
        total: questions.length
      }
    })
  } catch (error) {
    console.error('Client questions fetch error:', error)
    return NextResponse.json({ error: 'Sorular alınamadı' }, { status: 500 })
  }
}

const CATEGORY_MAP: Record<string, QuestionCategory> = {
  antrenman: 'Antrenman',
  beslenme: 'Beslenme',
  supplement: 'Supplement',
  genel: 'Genel'
}

const PRIORITY_MAP: Record<string, QuestionPriority> = {
  dusuk: 'Dusuk',
  orta: 'Orta',
  yuksek: 'Yuksek'
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Geçersiz gövde' }, { status: 400 })
    }

    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const questionText = typeof body.question === 'string' ? body.question.trim() : ''
    const categoryKey = typeof body.category === 'string' ? body.category.toLowerCase() : ''
    const priorityKey = typeof body.priority === 'string' ? body.priority.toLowerCase() : ''
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!subject) {
      return NextResponse.json({ error: 'Konu alanı zorunludur' }, { status: 400 })
    }

    if (!questionText) {
      return NextResponse.json({ error: 'Soru metni zorunludur' }, { status: 400 })
    }

    const category = CATEGORY_MAP[categoryKey] ?? 'Genel'
    const priority = PRIORITY_MAP[priorityKey] ?? 'Orta'

    const relation = await prisma.trainerClient.findFirst({
      where: {
        clientId: session.user.id,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!relation) {
      return NextResponse.json({ error: 'Aktif eğitmeniniz bulunmuyor. Lütfen destek ile iletişime geçin.' }, { status: 400 })
    }

    const created = await prisma.supportQuestion.create({
      data: {
        clientId: session.user.id,
        trainerId: relation.trainerId,
        subject,
        category,
        priority,
        question: questionText,
        attachments: attachments.length > 0 ? attachments : undefined
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        trainer: {
          include: {
            profile: true
          }
        }
      }
    })

    try {
      const trainerEmail = created.trainer?.email ?? null
      const adminEmails = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true }
      })

      const recipients = new Set<string>()
      if (trainerEmail) recipients.add(trainerEmail)
      adminEmails.forEach((admin) => admin.email && recipients.add(admin.email))

      if (recipients.size > 0) {
        const clientName = created.client?.profile
          ? `${created.client.profile.firstName ?? ''} ${created.client.profile.lastName ?? ''}`.trim()
          : created.client?.email ?? null

        await sendSupportTicketNotification(
          Array.from(recipients),
          {
            name: clientName,
            subject: created.subject,
          },
          {
            actorId: session.user.id,
            actorEmail: session.user.email ?? created.client?.email ?? null,
            context: {
              clientId: created.clientId,
              questionId: created.id,
            },
          },
        )
      }
    } catch (error) {
      console.error('Support ticket mail error:', error)
    }

    return NextResponse.json({
      question: {
        id: created.id,
        subject: created.subject,
        category: created.category,
        categoryLabel: CATEGORY_LABELS[created.category],
        priority: created.priority,
        priorityLabel: PRIORITY_LABELS[created.priority],
        status: created.status,
        question: created.question,
        answer: created.answer,
        createdAt: created.createdAt.toISOString(),
        attachments: Array.isArray(created.attachments) ? created.attachments : [],
        trainer: created.trainer
          ? {
              id: created.trainerId,
              name: created.trainer.profile
                ? `${created.trainer.profile.firstName} ${created.trainer.profile.lastName}`.trim()
                : created.trainer.email
            }
          : null
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Client question create error:', error)
    return NextResponse.json({ error: 'Soru gönderilemedi' }, { status: 500 })
  }
}
