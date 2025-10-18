import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { sendProgramAssignedEmail } from '@/lib/mail'

type RouteParams = {
  params: {
    id: string
  }
}

type ProgramSupplementEntry = {
  id: string
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

const parseString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const ensureTrainerClientRelation = async (trainerId: string, clientId: string) => {
  let relation = await prisma.trainerClient.findFirst({
    where: {
      trainerId,
      clientId,
      isActive: true
    }
  })

  if (!relation) {
    relation = await prisma.trainerClient.upsert({
      where: {
        trainerId_clientId: {
          trainerId,
          clientId
        }
      },
      update: {
        isActive: true
      },
      create: {
        trainerId,
        clientId,
        isActive: true
      }
    })
  }

  return relation
}

const buildSupplementEntry = (args: {
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
}): ProgramSupplementEntry => ({
  id: randomUUID(),
  templateId: args.templateId,
  name: args.name,
  category: args.category,
  brand: args.brand,
  dosage: args.dosage,
  timing: args.timing,
  defaultDosage: args.defaultDosage,
  defaultTiming: args.defaultTiming,
  benefits: args.benefits,
  timingOptions: args.timingOptions,
  notes: args.notes,
  price: args.price
})

const normalizeEntries = (value: unknown): ProgramSupplementEntry[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Record<string, unknown>
      const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : randomUUID()
      const templateId =
        typeof entry.templateId === 'string' && entry.templateId.trim() ? entry.templateId.trim() : null
      const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null
      if (!templateId || !name) return null
      return {
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
      } satisfies ProgramSupplementEntry
    })
    .filter((item): item is ProgramSupplementEntry => item !== null)
}

const toJsonArray = (value: ProgramSupplementEntry[]): Prisma.JsonArray =>
  value as unknown as Prisma.JsonArray

const mapEntriesForResponse = (programId: string, entries: ProgramSupplementEntry[]) =>
  entries.map((entry) => ({
    ...entry,
    programId
  }))

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const templateId = parseString(body?.templateId)
    if (!templateId) {
      return NextResponse.json({ error: 'Supplement şablonu seçmelisiniz' }, { status: 400 })
    }

    const dosage = parseString(body?.dosage)
    const timing = parseString(body?.timing)
    const notes = parseString(body?.notes)
    const title = parseString(body?.title)
    const description = parseString(body?.description)

    await ensureTrainerClientRelation(trainerId, clientId)

    const template = await prisma.supplementTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Supplement bulunamadı' }, { status: 404 })
    }

    const supplementEntry = buildSupplementEntry({
      templateId: template.id,
      name: template.name,
      category: template.category ?? null,
      brand: template.brand ?? null,
      dosage: dosage ?? template.defaultDosage ?? null,
      timing: timing ?? template.defaultTiming ?? null,
      defaultDosage: template.defaultDosage ?? null,
      defaultTiming: template.defaultTiming ?? null,
      benefits: Array.isArray(template.benefits) ? template.benefits : [],
      timingOptions: Array.isArray(template.timingOptions) ? template.timingOptions : [],
      notes,
      price: typeof template.price === 'number' ? template.price : null
    })

    const existingProgram = await prisma.supplementProgram.findFirst({
      where: {
        trainerId,
        clientId,
        isActive: true
      }
    })

    if (existingProgram) {
      const entries = normalizeEntries(existingProgram.supplements)
      const existingIndex = entries.findIndex((entry) => entry.templateId === supplementEntry.templateId)

      if (existingIndex >= 0) {
        entries[existingIndex] = {
          ...supplementEntry,
          id: entries[existingIndex].id
        }
      } else {
        entries.push(supplementEntry)
      }

      const updatedProgram = await prisma.supplementProgram.update({
        where: { id: existingProgram.id },
        data: {
          title: title ?? existingProgram.title,
          description: description ?? existingProgram.description,
          supplements: toJsonArray(entries)
        }
      })

      await triggerSupplementMail(clientId, trainerId, {
        programId: updatedProgram.id,
        supplementCount: entries.length,
      })

      return NextResponse.json({
        program: {
          id: updatedProgram.id,
          supplements: mapEntriesForResponse(updatedProgram.id, entries)
        }
      })
    }

    const createdProgram = await prisma.supplementProgram.create({
      data: {
        trainerId,
        clientId,
        title: title ?? 'Supplement Programı',
        description: description ?? 'Danışan için oluşturulan supplement programı',
        supplements: toJsonArray([supplementEntry]),
        isActive: true
      }
    })

    await triggerSupplementMail(clientId, trainerId, {
      programId: createdProgram.id,
      supplementCount: 1,
    })

    return NextResponse.json({
      program: {
        id: createdProgram.id,
        supplements: mapEntriesForResponse(createdProgram.id, [supplementEntry])
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Supplement assignment create error:', error)
    return NextResponse.json({ error: 'Supplement atanamadı' }, { status: 500 })
  }
}

async function triggerSupplementMail(
  clientId: string,
  trainerId: string,
  details?: { programId?: string; supplementCount?: number },
) {
  try {
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        email: true,
      },
    })

    if (client?.email) {
      const name = client.profile
        ? `${client.profile.firstName ?? ''} ${client.profile.lastName ?? ''}`.trim()
        : client.email
      const trainerName = trainer?.profile
        ? `${trainer.profile.firstName ?? ''} ${trainer.profile.lastName ?? ''}`.trim()
        : trainer?.email ?? null

      await sendProgramAssignedEmail(
        client.email,
        {
          name,
          programType: 'Supplement',
          trainerName,
        },
        {
          actorId: trainerId,
          actorEmail: trainer?.email ?? null,
          context: {
            clientId,
            trainerId,
            programId: details?.programId ?? null,
            supplementCount: details?.supplementCount ?? null,
          },
        },
      )
    }
  } catch (error) {
    console.error('Supplement program mail error:', error)
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const trainerId = session.user.id
    const clientId = params.id
    if (!clientId) {
      return NextResponse.json({ error: 'Geçersiz danışan' }, { status: 400 })
    }

    const url = new URL(request.url)
    const programId = url.searchParams.get('programId')
    const entryId = url.searchParams.get('entryId')

    if (!programId || !entryId) {
      return NextResponse.json({ error: 'Silinecek supplement seçilmedi' }, { status: 400 })
    }

    const program = await prisma.supplementProgram.findUnique({
      where: { id: programId }
    })

    if (!program || program.clientId !== clientId) {
      return NextResponse.json({ error: 'Supplement programı bulunamadı' }, { status: 404 })
    }

    if (program.trainerId !== trainerId) {
      return NextResponse.json({ error: 'Bu supplement programını yönetme yetkiniz yok' }, { status: 403 })
    }

    const entries = normalizeEntries(program.supplements)
    const filteredEntries = entries.filter((entry) => entry.id !== entryId)

    if (filteredEntries.length === 0) {
      await prisma.supplementProgram.update({
        where: { id: programId },
        data: {
          supplements: toJsonArray([]),
          isActive: false
        }
      })

      return NextResponse.json({ program: { id: programId, supplements: [] } })
    }

    const updatedProgram = await prisma.supplementProgram.update({
      where: { id: programId },
      data: {
        supplements: toJsonArray(filteredEntries)
      }
    })

    return NextResponse.json({
      program: {
        id: updatedProgram.id,
        supplements: mapEntriesForResponse(updatedProgram.id, filteredEntries)
      }
    })
  } catch (error) {
    console.error('Supplement assignment delete error:', error)
    return NextResponse.json({ error: 'Supplement kaldırılamadı' }, { status: 500 })
  }
}
