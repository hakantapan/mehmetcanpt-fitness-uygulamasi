import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const defaultSupplements = [
  {
    name: 'Whey Protein',
    category: 'Protein',
    brand: 'Optimum Nutrition',
    description: 'Kas kütlesi artışı ve toparlanma için temel protein desteği',
    defaultDosage: '30g',
    defaultTiming: 'Antrenman Sonrası',
    timingOptions: ['Antrenman Sonrası', 'Kahvaltı'],
    benefits: ['Kas yapımı', 'Toparlanma'],
    price: 250,
    stock: 15,
    warnings: 'Laktoz intoleransı olanlar dikkat etmeli'
  },
  {
    name: 'Creatine Monohydrate',
    category: 'Performans',
    brand: 'Universal',
    description: 'Güç artışı ve yüksek yoğunluklu antrenmanlar için kreatin desteği',
    defaultDosage: '5g',
    defaultTiming: 'Antrenman Öncesi',
    timingOptions: ['Antrenman Öncesi', 'Antrenman Sonrası'],
    benefits: ['Güç artışı', 'Performans'],
    price: 120,
    stock: 8,
    warnings: 'Bol su tüketimi gerekli'
  },
  {
    name: 'Multivitamin',
    category: 'Vitamin',
    brand: 'Centrum',
    description: 'Günlük vitamin ve mineral ihtiyacını destekleyen kompleks formül',
    defaultDosage: '1 tablet',
    defaultTiming: 'Kahvaltı',
    timingOptions: ['Kahvaltı'],
    benefits: ['Genel sağlık', 'Bağışıklık'],
    price: 80,
    stock: 25,
    warnings: 'Aşırı dozda alınmamalı'
  },
  {
    name: 'Omega-3',
    category: 'Yağ Asidi',
    brand: 'Nordic Naturals',
    description: 'Kalp ve beyin sağlığını destekleyen yüksek saflıkta omega-3 desteği',
    defaultDosage: '2 kapsül',
    defaultTiming: 'Yemek ile',
    timingOptions: ['Yemek ile', 'Akşam Yemeği'],
    benefits: ['Kalp sağlığı', 'Beyin fonksiyonu'],
    price: 180,
    stock: 12,
    warnings: 'Kan sulandırıcı kullananlar dikkat etmeli'
  },
  {
    name: 'BCAA',
    category: 'Amino Asit',
    brand: 'Scivation',
    description: 'Kas korunması ve yorgunluk azaltımı için dallı zincirli amino asit desteği',
    defaultDosage: '10g',
    defaultTiming: 'Antrenman Sırası',
    timingOptions: ['Antrenman Sırası'],
    benefits: ['Kas korunması', 'Yorgunluk azaltma'],
    price: 150,
    stock: 6,
    warnings: 'Aç karnına alınabilir'
  }
]

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

const ensureSeedSupplements = async () => {
  const count = await prisma.supplementTemplate.count()
  if (count > 0) return

  await prisma.supplementTemplate.createMany({
    data: defaultSupplements,
    skipDuplicates: true
  })
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

export async function GET(request: Request) {
  try {
    await ensureSeedSupplements()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const category = searchParams.get('category')?.trim()

    const supplements = await prisma.supplementTemplate.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { brand: { contains: search, mode: 'insensitive' } },
                  { category: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } }
                ]
              }
            : {},
          category && category !== 'all'
            ? {
                category: {
                  equals: category,
                  mode: 'insensitive'
                }
              }
            : {}
        ]
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      supplements: supplements.map(formatSupplement)
    })
  } catch (error) {
    console.error('Trainer supplements fetch error:', error)
    return NextResponse.json({ error: 'Supplement listesi alınamadı' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    const created = await prisma.supplementTemplate.create({
      data
    })

    return NextResponse.json({ supplement: formatSupplement(created) }, { status: 201 })
  } catch (error) {
    console.error('Trainer supplement create error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir supplement zaten mevcut' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Supplement oluşturulamadı' }, { status: 500 })
  }
}
