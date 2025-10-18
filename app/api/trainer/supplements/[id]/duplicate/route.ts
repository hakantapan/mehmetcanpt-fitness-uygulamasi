import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: {
    id: string
  }
}

const generateCopyName = async (baseName: string) => {
  const suffixBase = ' (Kopya'
  let attempt = 1
  // İlk kopya için " (Kopya)" sonrakiler " (Kopya 2)" şeklinde olsun
  while (attempt <= 50) {
    const suffix = attempt === 1 ? `${suffixBase})` : `${suffixBase} ${attempt})`
    const candidate = `${baseName}${suffix}`
    const existing = await prisma.supplementTemplate.findUnique({
      where: { name: candidate }
    })
    if (!existing) {
      return candidate
    }
    attempt += 1
  }
  return `${baseName} (Kopya ${Date.now()})`
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

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz supplement' }, { status: 400 })
    }

    const original = await prisma.supplementTemplate.findUnique({
      where: { id }
    })

    if (!original) {
      return NextResponse.json({ error: 'Supplement bulunamadı' }, { status: 404 })
    }

    const copyName = await generateCopyName(original.name)
    const duplicated = await prisma.supplementTemplate.create({
      data: {
        name: copyName,
        category: original.category,
        brand: original.brand,
        description: original.description,
        defaultDosage: original.defaultDosage,
        defaultTiming: original.defaultTiming,
        timingOptions: original.timingOptions,
        benefits: original.benefits,
        price: original.price,
        stock: original.stock,
        warnings: original.warnings
      }
    })

    return NextResponse.json({ supplement: formatSupplement(duplicated) }, { status: 201 })
  } catch (error) {
    console.error('Trainer supplement duplicate error:', error)
    return NextResponse.json({ error: 'Supplement kopyalanamadı' }, { status: 500 })
  }
}
