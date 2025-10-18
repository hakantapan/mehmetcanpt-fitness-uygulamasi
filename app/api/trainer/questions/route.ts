import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const mapSearchFilter = (search: string | null): Prisma.SupportQuestionWhereInput => {
  if (!search) return {}

  return {
    OR: [
      { subject: { contains: search, mode: 'insensitive' } },
      { question: { contains: search, mode: 'insensitive' } },
      {
        client: {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            {
              profile: {
                firstName: { contains: search, mode: 'insensitive' }
              }
            },
            {
              profile: {
                lastName: { contains: search, mode: 'insensitive' }
              }
            }
          ]
        }
      }
    ]
  }
}

const mapStatusFilter = (status: string | null): Prisma.SupportQuestionWhereInput => {
  if (!status || status === 'all') return {}
  return { status: status as any }
}

const mapCategoryFilter = (category: string | null): Prisma.SupportQuestionWhereInput => {
  if (!category || category === 'all') return {}
  return { category: category as any }
}

const mapPriorityFilter = (priority: string | null): Prisma.SupportQuestionWhereInput => {
  if (!priority || priority === 'all') return {}
  return { priority: priority as any }
}

const formatClientName = (client: { profile: { firstName: string; lastName: string } | null; email: string }) => {
  if (client.profile) {
    return `${client.profile.firstName} ${client.profile.lastName}`.trim()
  }
  return client.email
}

const CATEGORY_LABELS: Record<string, string> = {
  Antrenman: 'Antrenman',
  Beslenme: 'Beslenme',
  Supplement: 'Supplement',
  Genel: 'Genel'
}

const PRIORITY_LABELS: Record<string, string> = {
  Dusuk: 'Düşük',
  Orta: 'Orta',
  Yuksek: 'Yüksek'
}

const STATUS_LABELS: Record<string, string> = {
  Yeni: 'Yeni',
  Beklemede: 'Beklemede',
  Cevaplanmis: 'Cevaplanmış',
  Arsivlendi: 'Arşivlendi'
}

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS))
const ALLOWED_PRIORITIES = new Set(Object.keys(PRIORITY_LABELS))

const formatQuestion = (
  question: Prisma.SupportQuestionGetPayload<{ include: { client: { include: { profile: true } } } }>,
) => ({
  id: question.id,
  subject: question.subject,
  category: question.category,
  categoryLabel: CATEGORY_LABELS[question.category] ?? question.category,
  priority: question.priority,
  priorityLabel: PRIORITY_LABELS[question.priority] ?? question.priority,
  status: question.status,
  statusLabel: STATUS_LABELS[question.status] ?? question.status,
  question: question.question,
  answer: question.answer,
  answeredAt: question.answeredAt ? question.answeredAt.toISOString() : null,
  createdAt: question.createdAt.toISOString(),
  attachments: Array.isArray(question.attachments) ? question.attachments : [],
  client: {
    id: question.clientId,
    name: formatClientName(question.client),
    email: question.client.email,
    avatar: question.client.profile?.avatar ?? null,
  },
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const summaryOnly = searchParams.get('summary') === '1'
    const search = searchParams.get('search')?.trim() || null
    const statusFilter = searchParams.get('status')
    const categoryFilter = searchParams.get('category')
    const priorityFilter = searchParams.get('priority')

    const where: Prisma.SupportQuestionWhereInput = {
      trainerId: session.user.id,
      AND: [
        mapSearchFilter(search),
        mapStatusFilter(statusFilter),
        mapCategoryFilter(categoryFilter),
        mapPriorityFilter(priorityFilter)
      ]
    }

    let questions: Prisma.SupportQuestionGetPayload<{ include: { client: { include: { profile: true } } } }>[] = []

    if (!summaryOnly) {
      questions = await prisma.supportQuestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            include: {
              profile: true
            }
          }
        }
      })
    }

    const total = await prisma.supportQuestion.count({
      where: {
        trainerId: session.user.id
      }
    })

    const answered = await prisma.supportQuestion.count({
      where: {
        trainerId: session.user.id,
        status: 'Cevaplanmis'
      }
    })

    const pending = await prisma.supportQuestion.count({
      where: {
        trainerId: session.user.id,
        status: 'Beklemede'
      }
    })

    const newCount = await prisma.supportQuestion.count({
      where: {
        trainerId: session.user.id,
        status: 'Yeni'
      }
    })

    const data = questions.map((question) => formatQuestion(question))

    return NextResponse.json({
      questions: summaryOnly ? undefined : data,
      stats: {
        total,
        answered,
        pending,
        new: newCount,
      }
    })
  } catch (error) {
    console.error('Trainer questions fetch error:', error)
    return NextResponse.json({ error: 'Sorular alınamadı' }, { status: 500 })
  }
}

type CreateQuestionBody = {
  clientId?: unknown
  subject?: unknown
  category?: unknown
  priority?: unknown
  question?: unknown
}

const parseString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body: CreateQuestionBody = await request.json().catch(() => ({}))
    const clientId = parseString(body.clientId)
    const subject = parseString(body.subject)
    const category = parseString(body.category)
    const priority = parseString(body.priority)
    const questionText = parseString(body.question)

    if (!clientId) {
      return NextResponse.json({ error: 'Danışan seçimi zorunludur' }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({ error: 'Konu başlığı zorunludur' }, { status: 400 })
    }

    if (!category || !ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Geçerli bir kategori seçmelisiniz' }, { status: 400 })
    }

    if (!priority || !ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: 'Geçerli bir öncelik seçmelisiniz' }, { status: 400 })
    }

    if (!questionText) {
      return NextResponse.json({ error: 'Soru metni zorunludur' }, { status: 400 })
    }

    const trainerClient = await prisma.trainerClient.findFirst({
      where: {
        trainerId: session.user.id,
        clientId
      }
    })

    if (!trainerClient) {
      return NextResponse.json({ error: 'Bu danışana soru gönderme yetkiniz bulunmuyor' }, { status: 403 })
    }

    const created = await prisma.supportQuestion.create({
      data: {
        trainerId: session.user.id,
        clientId,
        subject,
        category: category as Prisma.SupportQuestionCreateInput['category'],
        priority: priority as Prisma.SupportQuestionCreateInput['priority'],
        question: questionText,
        status: 'Yeni'
      },
      include: {
        client: {
          include: {
            profile: true
          }
        }
      }
    })

    return NextResponse.json({
      question: formatQuestion(created)
    }, { status: 201 })
  } catch (error) {
    console.error('Trainer question create error:', error)
    return NextResponse.json({ error: 'Soru oluşturulamadı' }, { status: 500 })
  }
}
