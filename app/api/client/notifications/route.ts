import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Son 7 gün

    // Yanıtlanmış sorular
    const answeredQuestions = await prisma.supportQuestion.findMany({
      where: {
        clientId: userId,
        answer: { not: null },
        status: 'Cevaplanmis',
        answeredAt: { gte: sevenDaysAgo }
      },
      orderBy: { answeredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        answer: true,
        answeredAt: true
      }
    })

    // Yeni atanan antrenman programları
    const newWorkoutPrograms = await prisma.workoutProgram.findMany({
      where: {
        clientId: userId,
        isActive: true,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    })

    // Yeni atanan beslenme programları
    const newNutritionPrograms = await prisma.nutritionProgram.findMany({
      where: {
        clientId: userId,
        isActive: true,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    })

    // Yeni atanan supplement programları
    const newSupplementPrograms = await prisma.supplementProgram.findMany({
      where: {
        clientId: userId,
        isActive: true,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    })

    // Bildirimleri formatla
    const notifications: Array<{
      id: string
      type: 'question' | 'workout' | 'nutrition' | 'supplement'
      title: string
      message: string
      date: Date
      link: string
    }> = []

    answeredQuestions.forEach((q) => {
      notifications.push({
        id: q.id,
        type: 'question',
        title: 'Soru Yanıtlandı',
        message: q.subject,
        date: q.answeredAt!,
        link: '/soru-merkezi'
      })
    })

    newWorkoutPrograms.forEach((p) => {
      notifications.push({
        id: p.id,
        type: 'workout',
        title: 'Yeni Antrenman Programı',
        message: p.title,
        date: p.createdAt,
        link: '/antrenman'
      })
    })

    newNutritionPrograms.forEach((p) => {
      notifications.push({
        id: p.id,
        type: 'nutrition',
        title: 'Yeni Beslenme Programı',
        message: p.title,
        date: p.createdAt,
        link: '/beslenme'
      })
    })

    newSupplementPrograms.forEach((p) => {
      notifications.push({
        id: p.id,
        type: 'supplement',
        title: 'Yeni Supplement Programı',
        message: p.title,
        date: p.createdAt,
        link: '/supplement'
      })
    })

    // Tarihe göre sırala (en yeni önce)
    notifications.sort((a, b) => b.date.getTime() - a.date.getTime())

    const totalCount = notifications.length

    return NextResponse.json({
      count: totalCount,
      notifications: notifications.map(n => ({
        ...n,
        date: n.date.toISOString()
      })),
      breakdown: {
        answeredQuestions: answeredQuestions.length,
        newWorkoutPrograms: newWorkoutPrograms.length,
        newNutritionPrograms: newNutritionPrograms.length,
        newSupplementPrograms: newSupplementPrograms.length
      }
    })
  } catch (error) {
    console.error('Client notifications fetch error:', error)
    return NextResponse.json({ error: 'Bildirimler alınamadı' }, { status: 500 })
  }
}

