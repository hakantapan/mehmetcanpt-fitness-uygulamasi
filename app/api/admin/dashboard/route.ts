import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { ensureMailScheduler } from "@/lib/scheduler"
import { subMonths, startOfMonth } from "date-fns"

ensureMailScheduler()

type StatCard = {
  label: string
  value: number
  change: number
}

type HealthItem = {
  name: string
  status: "online" | "warning" | "offline"
  uptime: number
  icon: string
}

type ChartPoint = {
  month: string
  users: number
  revenue: number
}

const SERVICE_HEALTH_SOURCES: Record<string, { name: string; icon: string }> = {
  web: { name: "Web Sunucu", icon: "server" },
  db: { name: "Veritabanı", icon: "database" },
  security: { name: "Güvenlik", icon: "shield" },
  api: { name: "API Servisleri", icon: "activity" },
}

const monthsBack = 6
const monthLabels = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

async function getSummaryStats(): Promise<{
  cards: StatCard[]
  trainerCount: number
}> {
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const previousMonthStart = startOfMonth(subMonths(now, 1))

  const [totalUsers, prevMonthUsers, currentMonthUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth(subMonths(now, 1)),
          lt: currentMonthStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),
  ])

  const [activeClients, prevActiveClients] = await Promise.all([
    prisma.user.count({
      where: {
        role: "CLIENT",
        isActive: true,
      },
    }),
    prisma.user.count({
      where: {
        role: "CLIENT",
        isActive: true,
        updatedAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ])

  const trainerCount = await prisma.user.count({
    where: {
      role: "TRAINER",
      isActive: true,
    },
  })

  const [currentRevenue, previousRevenue] = await Promise.all([
    prisma.trainerOrder.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentStatus: "Odendi",
        orderDate: {
          gte: currentMonthStart,
        },
      },
    }),
    prisma.trainerOrder.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentStatus: "Odendi",
        orderDate: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ])

  const systemPerformance = await prisma.adminLog.count({
    where: {
      level: "ERROR",
      createdAt: {
        gte: subMonths(now, 1),
      },
    },
  })

  const performanceScore = Math.max(92, 100 - systemPerformance * 2)

  const cards: StatCard[] = [
    {
      label: "Toplam Kullanıcı",
      value: totalUsers,
      change: prevMonthUsers === 0 ? 100 : ((currentMonthUsers - prevMonthUsers) / Math.max(prevMonthUsers, 1)) * 100,
    },
    {
      label: "Aktif Danışan",
      value: activeClients,
      change: prevActiveClients === 0
        ? 100
        : ((activeClients - prevActiveClients) / Math.max(prevActiveClients, 1)) * 100,
    },
    {
      label: "Aylık Gelir",
      value: currentRevenue._sum.amount ?? 0,
      change: (currentRevenue._sum.amount ?? 0) === 0 && (previousRevenue._sum.amount ?? 0) === 0
        ? 0
        : (((currentRevenue._sum.amount ?? 0) - (previousRevenue._sum.amount ?? 0)) /
            Math.max(previousRevenue._sum.amount ?? 0, 1)) *
          100,
    },
    {
      label: "Sistem Performansı",
      value: performanceScore,
      change: 0,
    },
  ]

  return { cards, trainerCount }
}

async function getHealth(): Promise<HealthItem[]> {
  const since = subMonths(new Date(), 1)

  const errorLogs = await prisma.adminLog.groupBy({
    by: ["source", "level"],
    where: {
      source: {
        in: Object.keys(SERVICE_HEALTH_SOURCES),
      },
      createdAt: {
        gte: since,
      },
    },
    _count: true,
  })

  return Object.entries(SERVICE_HEALTH_SOURCES).map(([key, meta]) => {
    const errorEntry = errorLogs.find((log) => log.source === key && log.level === "ERROR")
    const warnEntry = errorLogs.find((log) => log.source === key && log.level === "WARN")
    const totalIssues = (errorEntry?._count ?? 0) + (warnEntry?._count ?? 0)
    const uptime = Math.max(90, 100 - totalIssues * 2)

    let status: "online" | "warning" | "offline" = "online"
    if (errorEntry?._count) {
      status = "warning"
    }

    return {
      name: meta.name,
      status,
      uptime,
      icon: meta.icon,
    }
  })
}

async function getChartData(): Promise<ChartPoint[]> {
  const now = new Date()
  const points: ChartPoint[] = []

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const monthDate = subMonths(now, i)
    const monthStart = startOfMonth(monthDate)
    const nextMonthStart = startOfMonth(subMonths(monthDate, -1))

    const [users, revenue] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.trainerOrder.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          paymentStatus: "Odendi",
          orderDate: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
    ])

    points.push({
      month: monthLabels[monthDate.getMonth()],
      users,
      revenue: revenue._sum.amount ?? 0,
    })
  }

  return points
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
    }

    const [summary, health, chart] = await Promise.all([
      getSummaryStats(),
      getHealth(),
      getChartData(),
    ])

    return NextResponse.json({
      stats: summary.cards,
      trainerCount: summary.trainerCount,
      health,
      chart,
    })
  } catch (error) {
    console.error("Admin dashboard stats error:", error)
    return NextResponse.json({ error: "Panel verileri yüklenemedi" }, { status: 500 })
  }
}
