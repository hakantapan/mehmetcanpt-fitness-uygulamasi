import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma, OrderStatus, PaymentStatus } from '@prisma/client'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

const STATUS_LABELS: Record<string, string> = {
  Aktif: 'Aktif',
  Tamamlandi: 'Tamamlandı',
  Beklemede: 'Beklemede',
  Iptal: 'İptal',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Odendi: 'Ödendi',
  Bekliyor: 'Bekliyor',
  IadeEdildi: 'İade Edildi',
}

const ORDER_STATUS_KEYS = new Set(Object.keys(STATUS_LABELS))
const PAYMENT_STATUS_KEYS = new Set(Object.keys(PAYMENT_STATUS_LABELS))

const isOrderStatus = (value: string): value is OrderStatus => ORDER_STATUS_KEYS.has(value)
const isPaymentStatus = (value: string): value is PaymentStatus => PAYMENT_STATUS_KEYS.has(value)

const parseServices = (value: Prisma.JsonValue | null): string[] => {
  if (!value) return []

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? [trimmed] : []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim()
          return trimmed.length > 0 ? trimmed : null
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          const nameLikeKeys = ['name', 'title', 'label', 'service']

          for (const key of nameLikeKeys) {
            const candidate = record[key]
            if (typeof candidate === 'string') {
              const trimmed = candidate.trim()
              if (trimmed.length > 0) {
                return trimmed
              }
            }
          }
        }

        return null
      })
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const nameLikeKeys = ['name', 'title', 'label', 'service']

    for (const key of nameLikeKeys) {
      const candidate = record[key]
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim()
        if (trimmed.length > 0) {
          return [trimmed]
        }
      }
    }
  }

  return []
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const statusFilter = searchParams.get('status')
    const paymentStatusFilter = searchParams.get('paymentStatus')

    const filters: Prisma.TrainerOrderWhereInput[] = []

    if (search) {
      filters.push({
        OR: [
          { clientName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
          { packageName: { contains: search, mode: 'insensitive' } },
          { id: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    if (statusFilter && statusFilter !== 'all' && isOrderStatus(statusFilter)) {
      filters.push({ status: { equals: statusFilter } })
    }

    if (paymentStatusFilter && paymentStatusFilter !== 'all' && isPaymentStatus(paymentStatusFilter)) {
      filters.push({ paymentStatus: { equals: paymentStatusFilter } })
    }

    const where: Prisma.TrainerOrderWhereInput = {
      trainerId: session.user.id,
      AND: filters.length > 0 ? filters : undefined,
    }

    const orders = await prisma.trainerOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
    })

    const data = orders.map((order) => ({
      id: order.id,
      clientName: order.clientName,
      clientEmail: order.clientEmail ?? null,
      clientAvatar: order.clientAvatar ?? null,
      packageName: order.packageName,
      packageType: order.packageType ?? null,
      amount: order.amount,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] ?? order.status,
      paymentStatus: order.paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
      orderDate: order.orderDate.toISOString(),
      startDate: order.startDate ? order.startDate.toISOString() : null,
      endDate: order.endDate ? order.endDate.toISOString() : null,
      services: parseServices(order.services),
      notes: order.notes ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }))

    return NextResponse.json({ orders: data })
  } catch (error) {
    console.error('Trainer orders fetch error:', error)
    return NextResponse.json({ error: 'Siparişler alınamadı' }, { status: 500 })
  }
}
