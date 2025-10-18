import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type QuickReplyPayload = {
  id?: unknown
  title?: unknown
  content?: unknown
}

const parseText = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const replies = await prisma.supportQuickReply.findMany({
      where: { trainerId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      quickReplies: replies.map((reply) => ({
        id: reply.id,
        title: reply.title,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        updatedAt: reply.updatedAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Trainer quick replies fetch error:', error)
    return NextResponse.json({ error: 'Hızlı yanıtlar alınamadı' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body: QuickReplyPayload = await request.json().catch(() => ({}))
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: 'İçerik zorunludur' }, { status: 400 })
    }

    const created = await prisma.supportQuickReply.create({
      data: {
        trainerId: session.user.id,
        title,
        content
      }
    })

    return NextResponse.json({
      quickReply: {
        id: created.id,
        title: created.title,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Trainer quick reply create error:', error)
    return NextResponse.json({ error: 'Hızlı yanıt oluşturulamadı' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body: QuickReplyPayload = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : null
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!id) {
      return NextResponse.json({ error: 'Geçersiz hızlı yanıt' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: 'İçerik zorunludur' }, { status: 400 })
    }

    const existing = await prisma.supportQuickReply.findFirst({
      where: {
        id,
        trainerId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Hızlı yanıt bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.supportQuickReply.update({
      where: { id },
      data: {
        title,
        content
      }
    })

    return NextResponse.json({
      quickReply: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Trainer quick reply update error:', error)
    return NextResponse.json({ error: 'Hızlı yanıt güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Geçersiz hızlı yanıt' }, { status: 400 })
    }

    const existing = await prisma.supportQuickReply.findFirst({
      where: {
        id,
        trainerId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Hızlı yanıt bulunamadı' }, { status: 404 })
    }

    await prisma.supportQuickReply.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer quick reply delete error:', error)
    return NextResponse.json({ error: 'Hızlı yanıt silinemedi' }, { status: 500 })
  }
}

