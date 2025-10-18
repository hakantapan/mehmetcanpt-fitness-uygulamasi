import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { startOfDay, subDays, subMonths, addMonths, startOfMonth } from "date-fns"

type PeriodKey = "1m" | "3m" | "6m" | "1y"

const PERIODS: Record<PeriodKey, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
}

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return false
  }
  return true
}

function parsePeriod(value: string | null): PeriodKey {
  if (!value) return "6m"
  if (value === "1m" || value === "3m" || value === "6m" || value === "1y") return value
  return "6m"
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function formatMonth(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]}`
}

async function getOrdersBetween(start: Date, end?: Date) {
  return prisma.trainerOrder.findMany({
    where: {
      paymentStatus: "Odendi",
      orderDate: {
        gte: start,
        lt: end,
      },
    },
    select: {
      id: true,
      amount: true,
      orderDate: true,
      clientName: true,
      clientEmail: true,
      packageName: true,
      status: true,
      paymentStatus: true,
      notes: true,
    },
    orderBy: {
      orderDate: "desc",
    },
  })
}

async function getFinancialMetrics(period: PeriodKey) {
  const now = new Date()
  const periodDays = PERIODS[period]
  const currentStart = startOfDay(subDays(now, periodDays))
  const previousStart = startOfDay(subDays(currentStart, periodDays))

  const [currentOrders, previousOrders] = await Promise.all([
    getOrdersBetween(currentStart),
    getOrdersBetween(previousStart, currentStart),
  ])

  const currentRevenue = currentOrders.reduce((sum, order) => sum + order.amount, 0)
  const previousRevenue = previousOrders.reduce((sum, order) => sum + order.amount, 0)
  const currentOrdersCount = currentOrders.length
  const previousOrdersCount = previousOrders.length

  const expenseRate = 0.55
  const currentExpenses = currentRevenue * expenseRate
  const previousExpenses = previousRevenue * expenseRate

  const metrics = [
    {
      name: "Toplam Gelir",
      value: currentRevenue,
      change: percentageChange(currentRevenue, previousRevenue),
      trend: currentRevenue >= previousRevenue ? "up" : "down",
      icon: "DollarSign",
    },
    {
      name: "Net Kar",
      value: currentRevenue - currentExpenses,
      change: percentageChange(currentRevenue - currentExpenses, previousRevenue - previousExpenses),
      trend: currentRevenue - currentExpenses >= previousRevenue - previousExpenses ? "up" : "down",
      icon: "TrendingUp",
    },
    {
      name: "Aylık Tekrarlayan Gelir",
      value: currentRevenue / Math.max(periodDays / 30, 1),
      change: percentageChange(
        currentRevenue / Math.max(periodDays / 30, 1),
        previousRevenue / Math.max(periodDays / 30, 1),
      ),
      trend: currentRevenue >= previousRevenue ? "up" : "down",
      icon: "Package",
    },
    {
      name: "Ortalama Sipariş Değeri",
      value: currentOrdersCount === 0 ? 0 : currentRevenue / currentOrdersCount,
      change: percentageChange(
        currentOrdersCount === 0 ? 0 : currentRevenue / currentOrdersCount,
        previousOrdersCount === 0 ? 0 : previousRevenue / previousOrdersCount,
      ),
      trend:
        currentOrdersCount === 0 || previousOrdersCount === 0
          ? "up"
          : currentRevenue / currentOrdersCount >= previousRevenue / previousOrdersCount
            ? "up"
            : "down",
      icon: "CreditCard",
    },
  ]

  return { metrics, currentOrders }
}

async function getRevenueChart(months = 6) {
  const now = new Date()
  const chart: { month: string; revenue: number; expenses: number; profit: number; subscriptions: number }[] = []

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = subMonths(now, i)
    const start = startOfMonth(monthDate)
    const end = startOfMonth(addMonths(monthDate, 1))

    const [orders, purchases] = await Promise.all([
      getOrdersBetween(start, end),
      prisma.packagePurchase.count({
        where: {
          purchasedAt: {
            gte: start,
            lt: end,
          },
        },
      }),
    ])

    const revenue = orders.reduce((sum, order) => sum + order.amount, 0)
    const expenses = revenue * 0.55
    const profit = revenue - expenses

    chart.push({
      month: formatMonth(monthDate),
      revenue,
      expenses,
      profit,
      subscriptions: purchases,
    })
  }

  return chart
}

async function getPackageSales() {
  const purchases = await prisma.packagePurchase.findMany({
    include: {
      package: true,
    },
  })

  const map = new Map<string, { name: string; sales: number; revenue: number }>()

  purchases.forEach((purchase) => {
    if (!purchase.package) return
    const entry = map.get(purchase.package.id) ?? { name: purchase.package.name, sales: 0, revenue: 0 }
    entry.sales += 1
    entry.revenue += purchase.package.price
    map.set(purchase.package.id, entry)
  })

  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ef4444"]
  return Array.from(map.values()).map((entry, index) => ({
    ...entry,
    color: colors[index % colors.length],
  }))
}

function inferPaymentMethod(amount: number, index: number): string {
  if (amount >= 500) return "Kredi Kartı"
  if (amount >= 300) return index % 2 === 0 ? "Banka Kartı" : "Kredi Kartı"
  return "Havale/EFT"
}

function buildPaymentMethodStats(orders: Awaited<ReturnType<typeof getOrdersBetween>>) {
  const groups = new Map<string, { amount: number; transactions: number }>()

  orders.forEach((order, index) => {
    const method = inferPaymentMethod(order.amount, index)
    const group = groups.get(method) ?? { amount: 0, transactions: 0 }
    group.amount += order.amount
    group.transactions += 1
    groups.set(method, group)
  })

  const total = Array.from(groups.values()).reduce((sum, item) => sum + item.amount, 0)

  return Array.from(groups.entries()).map(([method, stats]) => ({
    method,
    amount: stats.amount,
    percentage: total === 0 ? 0 : Math.round((stats.amount / total) * 100),
    transactions: stats.transactions,
  }))
}

function buildTopCustomers(orders: Awaited<ReturnType<typeof getOrdersBetween>>) {
  const map = new Map<string, { name: string; email: string; totalSpent: number; orders: number }>()

  orders.forEach((order) => {
    const key = order.clientEmail ?? order.clientName ?? `client-${order.id}`
    const entry = map.get(key) ?? {
      name: order.clientName ?? "Bilinmeyen Müşteri",
      email: order.clientEmail ?? "-",
      totalSpent: 0,
      orders: 0,
    }
    entry.totalSpent += order.amount
    entry.orders += 1
    map.set(key, entry)
  })

  return Array.from(map.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      ltv: item.totalSpent * 1.2,
    }))
}

async function getRecentTransactions() {
  const orders = await prisma.trainerOrder.findMany({
    orderBy: { orderDate: "desc" },
    take: 20,
  })

  return orders.map((order, index) => ({
    id: order.id,
    customer: order.clientName,
    amount: order.amount,
    package: order.packageName,
    method: inferPaymentMethod(order.amount, index),
    status: order.paymentStatus === "Odendi" ? "completed" : order.paymentStatus === "Bekliyor" ? "pending" : "failed",
    date: order.orderDate.toISOString(),
  }))
}

function estimateExpenseCategories(totalExpenses: number) {
  const categories = [
    { category: "Sunucu & Altyapı", ratio: 0.32 },
    { category: "Pazarlama", ratio: 0.26 },
    { category: "Personel", ratio: 0.22 },
    { category: "Lisanslar", ratio: 0.12 },
    { category: "Diğer", ratio: 0.08 },
  ]

  return categories.map((item) => ({
    category: item.category,
    amount: totalExpenses * item.ratio,
    percentage: Math.round(item.ratio * 100),
  }))
}

export async function GET(request: NextRequest) {
  const authorized = await ensureAdmin()
  if (!authorized) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const period = parsePeriod(url.searchParams.get("period"))

    const { metrics, currentOrders } = await getFinancialMetrics(period)
    const chart = await getRevenueChart()
    const packageStats = await getPackageSales()
    const paymentStats = buildPaymentMethodStats(currentOrders)
    const topCustomers = buildTopCustomers(currentOrders)
    const transactions = await getRecentTransactions()

    const totalExpenses = chart.reduce((sum, item) => sum + item.expenses, 0)
    const expenses = estimateExpenseCategories(totalExpenses)

    return NextResponse.json({
      metrics,
      revenue: chart,
      packageSales: packageStats,
      paymentMethods: paymentStats,
      topCustomers,
      transactions,
      expenses,
    })
  } catch (error) {
    console.error("Admin financial reports error:", error)
    return NextResponse.json({ error: "Finansal veriler yüklenemedi" }, { status: 500 })
  }
}
