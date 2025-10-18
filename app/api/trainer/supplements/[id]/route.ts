import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

const parseString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim())
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const parseIntNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const formatSupplement = (supplement: any) => ({
  id: supplement.id,
  name: supplement.name,
  category: supplement.category,
  brand: supplement.brand,
  description: supplement.description,
  defaultDosage: supplement.defaultDosage,
  defaultTiming: supplement.defaultTiming,
  timingOptions: Array.isArray(supplement.timingOptions) ? supplement.timingOptions : [],
  benefits: Array.isArray(supplement.benefits) ? supplement.benefits : [],
  price: typeof supplement.price === 'number' ? supplement.price : null,
  stock: typeof supplement.stock === 'number' ? supplement.stock : null,
  warnings: supplement.warnings,
  createdAt: supplement.createdAt?.toISOString?.() ?? null,
  updatedAt: supplement.updatedAt?.toISOString?.() ?? null
})

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz supplement' }, { status: 400 })
    }

    const supplement = await prisma.supplementTemplate.findUnique({
      where: { id }
    })

    if (!supplement) {
      return NextResponse.json({ error: 'Supplement bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ supplement: formatSupplement(supplement) })
  } catch (error) {
    console.error('Trainer supplement detail error:', error)
    return NextResponse.json({ error: 'Supplement bilgisi alınamadı' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz supplement' }, { status: 400 })
    }

    const body = await request.json()

    const name = parseString(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'Supplement adı zorunludur' }, { status: 400 })
    }

    const data = {
      name,
      category: parseString(body?.category),
      brand: parseString(body?.brand),
      description: parseString(body?.description),
      defaultDosage: parseString(body?.defaultDosage),
      defaultTiming: parseString(body?.defaultTiming),
      timingOptions: parseStringArray(body?.timingOptions),
      benefits: parseStringArray(body?.benefits),
      price: parseNumber(body?.price),
      stock: parseIntNumber(body?.stock),
      warnings: parseString(body?.warnings)
    }

    const updated = await prisma.supplementTemplate.update({
      where: { id },
      data
    })

    return NextResponse.json({ supplement: formatSupplement(updated) })
  } catch (error) {
    console.error('Trainer supplement update error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir supplement zaten mevcut' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Supplement güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz supplement' }, { status: 400 })
    }

    await prisma.supplementTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trainer supplement delete error:', error)
    return NextResponse.json({ error: 'Supplement silinemedi' }, { status: 500 })
  }
}
