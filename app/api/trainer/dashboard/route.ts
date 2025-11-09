import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { startOfMonth, endOfMonth, subMonths, startOfDay, addDays } from 'date-fns'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  Aktif: 'Aktif',
  Tamamlandi: 'Tamamlandı',
  Beklemede: 'Beklemede',
  Iptal: 'İptal'
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Odendi: 'Ödendi',
  Bekliyor: 'Bekliyor',
  IadeEdildi: 'İade Edildi'
}

const makeMonthKey = (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
const monthLabelFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long' })

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const trainerId = session.user.id
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const previousMonthStart = startOfMonth(subMonths(now, 1))
    const previousMonthEnd = endOfMonth(subMonths(now, 1))
    const trendStart = startOfMonth(subMonths(now, 5))
    const upcomingStart = startOfDay(now)
    const upcomingEnd = addDays(upcomingStart, 7)

    const [
      totalClients,
      activeClients,
      newClientsThisMonth,
      recentClientLinks,
      recentOrdersRaw,
      upcomingSessionsRaw,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenueAgg,
      pendingRevenueAgg,
      monthlyRevenueAgg,
      previousMonthRevenueAgg,
      revenueTrendOrders,
      clientTrendLinks,
      activeWorkoutPrograms,
      activeDietPrograms,
      activeSupplementPrograms,
      openQuestionCount,
      urgentQuestionCount
    ] = await Promise.all([
      prisma.trainerClient.count({
        where: { trainerId }
      }),
      prisma.trainerClient.count({
        where: { trainerId, isActive: true }
      }),
      prisma.trainerClient.count({
        where: {
          trainerId,
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      prisma.trainerClient.findMany({
        where: { trainerId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          client: {
            include: { profile: true }
          }
        }
      }),
      prisma.trainerOrder.findMany({
        where: { trainerId },
        orderBy: { orderDate: 'desc' },
        take: 6
      }),
      prisma.trainerOrder.findMany({
        where: {
          trainerId,
          OR: [
            {
              startDate: {
                gte: upcomingStart,
                lte: upcomingEnd
              }
            },
            {
              AND: [
                { startDate: null },
                {
                  orderDate: {
                    gte: upcomingStart,
                    lte: upcomingEnd
                  }
                }
              ]
            }
          ]
        },
        orderBy: [{ startDate: 'asc' }, { orderDate: 'asc' }],
        take: 6
      }),
      prisma.trainerOrder.count({
        where: { trainerId }
      }),
      prisma.trainerOrder.count({
        where: { trainerId, status: 'Tamamlandi' }
      }),
      prisma.trainerOrder.count({
        where: { trainerId, paymentStatus: 'Bekliyor' }
      }),
      prisma.trainerOrder.aggregate({
        where: { trainerId, paymentStatus: 'Odendi' },
        _sum: { amount: true }
      }),
      prisma.trainerOrder.aggregate({
        where: { trainerId, paymentStatus: 'Bekliyor' },
        _sum: { amount: true }
      }),
      prisma.trainerOrder.aggregate({
        where: {
          trainerId,
          paymentStatus: 'Odendi',
          orderDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.trainerOrder.aggregate({
        where: {
          trainerId,
          paymentStatus: 'Odendi',
          orderDate: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.trainerOrder.findMany({
        where: {
          trainerId,
          paymentStatus: 'Odendi',
          orderDate: {
            gte: trendStart
          }
        },
        select: {
          orderDate: true,
          amount: true
        }
      }),
      prisma.trainerClient.findMany({
        where: {
          trainerId,
          createdAt: {
            gte: trendStart
          }
        },
        select: {
          createdAt: true
        }
      }),
      prisma.workoutProgram.count({
        where: { trainerId, isActive: true }
      }),
      prisma.nutritionProgram.count({
        where: { trainerId, isActive: true }
      }),
      prisma.supplementProgram.count({
        where: { trainerId, isActive: true }
      }),
      prisma.supportQuestion.count({
        where: {
          trainerId,
          status: { in: ['Yeni', 'Beklemede'] }
        }
      }),
      prisma.supportQuestion.count({
        where: {
          trainerId,
          status: { in: ['Yeni', 'Beklemede'] },
          priority: 'Yuksek'
        }
      })
    ])

    const inactiveClients = totalClients - activeClients

    const totalRevenue = totalRevenueAgg._sum.amount ?? 0
    const pendingRevenue = pendingRevenueAgg._sum.amount ?? 0
    const monthlyRevenue = monthlyRevenueAgg._sum.amount ?? 0
    const previousMonthRevenue = previousMonthRevenueAgg._sum.amount ?? 0

    const revenueChangePercentage =
      previousMonthRevenue > 0
        ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : null

    const averageRevenuePerClient = totalClients > 0 ? totalRevenue / totalClients : null

    const recentClients = recentClientLinks
      .map((link) => {
        if (!link.client) return null
        const profile = link.client.profile
        const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : link.client.email

        return {
          id: link.clientId,
          name,
          email: link.client.email,
          status: link.isActive ? 'active' : 'inactive',
          joinDate: link.createdAt.toISOString(),
          lastActivity: link.client.updatedAt.toISOString(),
          program: profile?.fitnessGoal ?? null,
          avatar: profile?.avatar ?? null
        }
      })
      .filter((client): client is NonNullable<typeof client> => client !== null)

    const recentOrders = recentOrdersRaw.map((order) => ({
      id: order.id,
      clientName: order.clientName,
      packageName: order.packageName,
      packageType: order.packageType ?? null,
      amount: order.amount,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] ?? order.status,
      paymentStatus: order.paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
      orderDate: order.orderDate.toISOString()
    }))

    const upcomingSessions = upcomingSessionsRaw.map((session) => {
      const referenceDate = session.startDate ?? session.orderDate
      return {
        id: session.id,
        clientName: session.clientName,
        packageName: session.packageName,
        startDate: referenceDate ? referenceDate.toISOString() : null,
        status: session.status,
        statusLabel: STATUS_LABELS[session.status] ?? session.status
      }
    })

    const monthBuckets: { key: string; date: Date }[] = []
    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = startOfMonth(subMonths(now, index))
      monthBuckets.push({ key: makeMonthKey(monthDate), date: monthDate })
    }

    const revenueTrendMap = new Map<string, { revenue: number; orders: number }>()
    monthBuckets.forEach(({ key }) => {
      revenueTrendMap.set(key, { revenue: 0, orders: 0 })
    })

    revenueTrendOrders.forEach((entry) => {
      const key = makeMonthKey(entry.orderDate)
      if (!revenueTrendMap.has(key)) return
      const current = revenueTrendMap.get(key)!
      current.revenue += entry.amount
      current.orders += 1
    })

    const revenueTrend = monthBuckets.map(({ key, date }) => {
      const bucket = revenueTrendMap.get(key) ?? { revenue: 0, orders: 0 }
      return {
        key,
        label: `${monthLabelFormatter.format(date)} ${date.getFullYear()}`,
        revenue: bucket.revenue,
        orders: bucket.orders
      }
    })

    const clientTrendMap = new Map<string, number>()
    monthBuckets.forEach(({ key }) => clientTrendMap.set(key, 0))
    clientTrendLinks.forEach((link) => {
      const key = makeMonthKey(link.createdAt)
      if (!clientTrendMap.has(key)) return
      clientTrendMap.set(key, (clientTrendMap.get(key) ?? 0) + 1)
    })

    const clientTrend = monthBuckets.map(({ key, date }) => ({
      key,
      label: `${monthLabelFormatter.format(date)} ${date.getFullYear()}`,
      count: clientTrendMap.get(key) ?? 0
    }))

    return NextResponse.json({
      metrics: {
        totalClients,
        activeClients,
        inactiveClients,
        newClientsThisMonth,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        pendingRevenue,
        monthlyRevenue,
        previousMonthRevenue,
        revenueChangePercentage,
        averageRevenuePerClient
      },
      workload: {
        activeWorkoutPrograms,
        activeDietPrograms,
        activeSupplementPrograms,
        openQuestionCount,
        urgentQuestionCount
      },
      recentClients,
      recentOrders,
      upcomingSessions,
      revenueTrend,
      clientTrend
    })
  } catch (error) {
    console.error('Trainer dashboard summary error:', error)
    return NextResponse.json({ error: 'Dashboard verileri alınamadı' }, { status: 500 })
  }
}
