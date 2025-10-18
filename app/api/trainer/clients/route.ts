import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { PackageStatus, Prisma } from '@prisma/client'

const genderLabels: Record<string, string> = {
  Erkek: 'Erkek',
  Kadin: 'Kadın',
  Diger: 'Diğer'
}

const fitnessGoalLabels: Record<string, string> = {
  KiloVerme: 'Kilo Verme',
  KiloAlma: 'Kilo Alma',
  KasKazanma: 'Kas Kazanma',
  GenelSaglik: 'Genel Sağlık'
}

const activityLevelLabels: Record<string, string> = {
  Dusuk: 'Düşük',
  Orta: 'Orta',
  Yuksek: 'Yüksek'
}

type SupplementAssignmentSummary = {
  id: string
  programId: string
  templateId: string
  name: string
  category: string | null
  brand: string | null
  dosage: string | null
  timing: string | null
  defaultDosage: string | null
  defaultTiming: string | null
  benefits: string[]
  timingOptions: string[]
  notes: string | null
  price: number | null
}

type PtFormSummary = {
  id: string
  userId: string
  updatedAt: Date
  workoutLocation: string | null
  workoutDaysPerWeek: number | null
  experience: string | null
}

const parseSupplementEntries = (program: {
  id: string
  supplements: unknown
}): SupplementAssignmentSummary[] => {
  if (!Array.isArray(program.supplements)) return []

  return program.supplements
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const entry = item as Record<string, unknown>
      const templateId =
        typeof entry.templateId === 'string' && entry.templateId.trim().length > 0
          ? entry.templateId.trim()
          : ''
      const name =
        typeof entry.name === 'string' && entry.name.trim().length > 0
          ? entry.name.trim()
          : ''

      if (!templateId || !name) return null

      const dosage = typeof entry.dosage === 'string' ? entry.dosage : null
      const timing = typeof entry.timing === 'string' ? entry.timing : null
      const defaultDosage = typeof entry.defaultDosage === 'string' ? entry.defaultDosage : null
      const defaultTiming = typeof entry.defaultTiming === 'string' ? entry.defaultTiming : null
      const brand = typeof entry.brand === 'string' ? entry.brand : null
      const notes = typeof entry.notes === 'string' ? entry.notes : null
      const price = typeof entry.price === 'number' ? entry.price : null

      const benefits = Array.isArray(entry.benefits)
        ? entry.benefits
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : []

      const timingOptions = Array.isArray(entry.timingOptions)
        ? entry.timingOptions
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : []

      const id =
        typeof entry.id === 'string' && entry.id.trim().length > 0
          ? entry.id.trim()
          : `${program.id}-${index}`

      return {
        id,
        programId: program.id,
        templateId,
        name,
        category: typeof entry.category === 'string' ? entry.category : null,
        brand,
        dosage,
        timing,
        defaultDosage,
        defaultTiming,
        benefits,
        timingOptions,
        notes,
        price
      } satisfies SupplementAssignmentSummary
    })
    .filter((item): item is SupplementAssignmentSummary => item !== null)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const statusParam = searchParams.get('status')
    const searchParam = searchParams.get('search')?.trim() ?? ''

    const page = Math.max(Number.parseInt(pageParam ?? '1', 10) || 1, 1)
    const pageSize = Math.min(
      Math.max(Number.parseInt(pageSizeParam ?? '20', 10) || 20, 1),
      100
    )

    const filters: Prisma.UserWhereInput[] = [{ role: 'CLIENT' }]

    if (statusParam === 'active') {
      filters.push({ isActive: true })
    } else if (statusParam === 'inactive') {
      filters.push({ isActive: false })
    }

    if (searchParam) {
      filters.push({
        OR: [
          { email: { contains: searchParam, mode: 'insensitive' } },
          {
            profile: {
              OR: [
                { firstName: { contains: searchParam, mode: 'insensitive' } },
                { lastName: { contains: searchParam, mode: 'insensitive' } },
                { phone: { contains: searchParam, mode: 'insensitive' } }
              ]
            }
          }
        ]
      })
    }

    const where: Prisma.UserWhereInput = { AND: filters }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      matchedCount,
      totalCount,
      activeCount,
      inactiveCount,
      recentCount
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'CLIENT', isActive: true } }),
      prisma.user.count({ where: { role: 'CLIENT', isActive: false } }),
      prisma.user.count({
        where: {
          role: 'CLIENT',
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })
    ])

    const pageCount = matchedCount === 0 ? 0 : Math.ceil(matchedCount / pageSize)
    const currentPage = pageCount === 0 ? 0 : Math.min(page, pageCount)
    const skip = pageCount === 0 ? 0 : (currentPage - 1) * pageSize

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize,
      include: {
        profile: true
      }
    })

    const clientIds = users.map((user) => user.id)

type ActiveProgramSummary = {
  id: string
  title: string
  templateId: string | null
  createdAt: Date
  isActive: boolean
}

let activeProgramsMap = new Map<string, ActiveProgramSummary>()
type ActiveDietSummary = {
      id: string
      title: string
      templateId: string | null
      createdAt: Date
      isActive: boolean
}

let activeDietMap = new Map<string, ActiveDietSummary>()
let supplementAssignments = new Map<string, SupplementAssignmentSummary[]>()
let ptFormMap = new Map<string, PtFormSummary>()
type ActivePackageSummary = {
  id: string
  name: string | null
  price: number | null
  currency: string | null
  startsAt: Date
  expiresAt: Date
  status: PackageStatus
}
let activePackageMap = new Map<string, ActivePackageSummary>()

    const extractTemplateId = (value: unknown): string | null => {
      if (typeof value !== 'object' || value === null) return null
      const templateId = (value as { templateId?: unknown }).templateId
      if (typeof templateId !== 'string') return null
      const trimmed = templateId.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    if (clientIds.length > 0) {
      const [programs, diets, supplements, ptForms, packagePurchases] = await Promise.all([
        prisma.workoutProgram.findMany({
          where: {
            clientId: {
              in: clientIds
            },
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            clientId: true,
            title: true,
            createdAt: true,
            isActive: true,
            programData: true
          }
        }),
        prisma.nutritionProgram.findMany({
          where: {
            clientId: {
              in: clientIds
            },
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            clientId: true,
            title: true,
            createdAt: true,
            isActive: true,
            programData: true
          }
        }),
        prisma.supplementProgram.findMany({
          where: {
            clientId: {
              in: clientIds
            },
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            clientId: true,
            supplements: true
          }
        }),
        prisma.pTForm.findMany({
          where: {
            userId: {
              in: clientIds
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          distinct: ['userId'],
          select: {
            id: true,
            userId: true,
            updatedAt: true,
            workoutLocation: true,
            workoutDaysPerWeek: true,
            experience: true
          }
        }),
        prisma.packagePurchase.findMany({
          where: {
            userId: { in: clientIds },
            status: { in: ['ACTIVE', 'PENDING'] },
          },
          orderBy: {
            expiresAt: 'desc',
          },
          include: {
            package: true,
          },
        }),
      ])

      activeProgramsMap = programs.reduce((acc, program) => {
        const templateId = extractTemplateId(program.programData)
        if (!acc.has(program.clientId)) {
          acc.set(program.clientId, {
            id: program.id,
            title: program.title,
            templateId,
            createdAt: program.createdAt,
            isActive: program.isActive
          })
        }
        return acc
      }, new Map<string, ActiveProgramSummary>())

      activeDietMap = diets.reduce((acc, program) => {
        const templateId = extractTemplateId(program.programData)
        if (!acc.has(program.clientId)) {
          acc.set(program.clientId, {
            id: program.id,
            title: program.title,
            templateId,
            createdAt: program.createdAt,
            isActive: program.isActive
          })
        }
        return acc
      }, new Map<string, ActiveDietSummary>())

      supplementAssignments = supplements.reduce((acc, program) => {
        if (!acc.has(program.clientId)) {
          acc.set(program.clientId, parseSupplementEntries(program))
        }
        return acc
      }, new Map<string, SupplementAssignmentSummary[]>())

      ptFormMap = ptForms.reduce((acc, form) => {
        acc.set(form.userId, form)
        return acc
      }, new Map<string, PtFormSummary>())

      activePackageMap = packagePurchases.reduce((acc, purchase) => {
        if (acc.has(purchase.userId)) {
          return acc
        }

        acc.set(purchase.userId, {
          id: purchase.id,
          name: purchase.package?.name ?? null,
          price: purchase.package?.price ?? null,
          currency: purchase.package?.currency ?? null,
          startsAt: purchase.startsAt,
          expiresAt: purchase.expiresAt,
          status: purchase.status,
        })
        return acc
      }, new Map<string, ActivePackageSummary>())
    }

    const clients = users.map((user) => {
      const profile = user.profile
      const joinDate = user.createdAt.toISOString()
      const lastActivity = user.updatedAt.toISOString()
      const activeProgram = activeProgramsMap.get(user.id) ?? null
      const activeDiet = activeDietMap.get(user.id) ?? null
      const ptFormSummary = ptFormMap.get(user.id) ?? null
      const activePackage = activePackageMap.get(user.id) ?? null
      const paymentStatus = activePackage
        ? activePackage.status === 'PENDING'
          ? 'pending'
          : activePackage.status === 'ACTIVE'
          ? 'paid'
          : 'unknown'
        : 'unknown'

      return {
        id: user.id,
        name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email,
        email: user.email,
        phone: profile?.phone ?? null,
        age: profile?.age ?? null,
        gender: profile?.gender ? genderLabels[profile.gender] ?? profile.gender : null,
        joinDate,
        program: profile?.fitnessGoal ? fitnessGoalLabels[profile.fitnessGoal] ?? profile.fitnessGoal : null,
        activityLevel: profile?.activityLevel
          ? activityLevelLabels[profile.activityLevel] ?? profile.activityLevel
          : null,
        status: user.isActive ? 'active' : 'inactive',
        progress: null,
        currentWeight: profile?.weight ?? null,
        targetWeight: profile?.targetWeight ?? null,
        startWeight: null,
        lastActivity,
        avatar: profile?.avatar ?? null,
        notes: null,
        paymentStatus,
        package: activePackage?.name ?? null,
        packagePrice: activePackage?.price ?? null,
        packageEndDate: activePackage ? activePackage.expiresAt.toISOString() : null,
        packagePurchaseId: activePackage?.id ?? null,
        packageStatus: activePackage?.status ?? null,
        assignedWorkout: activeProgram
          ? {
              id: activeProgram.id,
              name: activeProgram.title,
              templateId: activeProgram.templateId,
              assignedDate: activeProgram.createdAt.toISOString(),
              status: activeProgram.isActive ? 'active' : 'inactive'
            }
          : null,
        assignedDiet: activeDiet
          ? {
              id: activeDiet.id,
              name: activeDiet.title,
              templateId: activeDiet.templateId,
              assignedDate: activeDiet.createdAt.toISOString(),
              status: activeDiet.isActive ? 'active' : 'inactive'
            }
          : null,
        assignedSupplements: supplementAssignments.get(user.id) ?? [],
        ptForm: ptFormSummary
          ? {
              id: ptFormSummary.id,
              updatedAt: ptFormSummary.updatedAt.toISOString(),
              workoutLocation: ptFormSummary.workoutLocation,
              workoutDaysPerWeek: ptFormSummary.workoutDaysPerWeek,
              experience: ptFormSummary.experience
            }
          : null,
        questions: [] as never[]
      }
    })

    return NextResponse.json({
      clients,
      meta: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        recent: recentCount,
        matched: matchedCount,
        page: currentPage,
        pageSize,
        pages: pageCount
      }
    })
  } catch (error) {
    console.error('Trainer clients fetch error:', error)
    return NextResponse.json({ error: 'Danışan listesi alınamadı' }, { status: 500 })
  }
}
