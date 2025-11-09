import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getActivePackagePurchase } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

type ProgramSupplement = {
  id?: string
  templateId?: string
  name?: string
  category?: string | null
  brand?: string | null
  dosage?: string | null
  timing?: string | null
  defaultDosage?: string | null
  defaultTiming?: string | null
  benefits?: unknown
  timingOptions?: unknown
  notes?: string | null
  price?: number | null
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const normalizeSupplementEntries = (value: unknown): Array<Required<ProgramSupplement>> => {
  if (!Array.isArray(value)) return []

  const supplements: Array<Required<ProgramSupplement>> = []

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') return

    const entry = item as ProgramSupplement
    const templateId =
      typeof entry.templateId === 'string' && entry.templateId.trim().length > 0
        ? entry.templateId.trim()
        : null
    const name =
      typeof entry.name === 'string' && entry.name.trim().length > 0
        ? entry.name.trim()
        : null

    if (!templateId || !name) return

    const id =
      typeof entry.id === 'string' && entry.id.trim().length > 0
        ? entry.id.trim()
        : `supplement-${index}-${templateId}`

    supplements.push({
      id,
      templateId,
      name,
      category: typeof entry.category === 'string' ? entry.category : null,
      brand: typeof entry.brand === 'string' ? entry.brand : null,
      dosage: typeof entry.dosage === 'string' ? entry.dosage : null,
      timing: typeof entry.timing === 'string' ? entry.timing : null,
      defaultDosage: typeof entry.defaultDosage === 'string' ? entry.defaultDosage : null,
      defaultTiming: typeof entry.defaultTiming === 'string' ? entry.defaultTiming : null,
      benefits: parseStringArray(entry.benefits),
      timingOptions: parseStringArray(entry.timingOptions),
      notes: typeof entry.notes === 'string' ? entry.notes : null,
      price: typeof entry.price === 'number' ? entry.price : null
    })
  })

  return supplements
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(userId)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const program = await prisma.supplementProgram.findFirst({
      where: {
        clientId: userId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!program) {
      return NextResponse.json({ program: null }, { status: 200 })
    }

    const supplements = normalizeSupplementEntries(program.supplements)

    return NextResponse.json({
      program: {
        id: program.id,
        title: program.title,
        description: program.description ?? null,
        assignedAt: program.createdAt.toISOString(),
        supplements
      }
    })
  } catch (error) {
    console.error('Client supplement program fetch error:', error)
    return NextResponse.json({ error: 'Supplement programı alınamadı' }, { status: 500 })
  }
}
