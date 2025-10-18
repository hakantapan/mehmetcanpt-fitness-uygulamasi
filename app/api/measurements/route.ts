import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getActivePackagePurchase } from '@/lib/subscription'
type MeasurementTypeStr = 'weight' | 'height' | 'chest' | 'waist' | 'hip' | 'arm' | 'thigh' | 'neck' | 'shoulder'
const MeasurementTypes: MeasurementTypeStr[] = ['weight','height','chest','waist','hip','arm','thigh','neck','shoulder']

function parseMeasurementType(input: unknown): MeasurementTypeStr | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim().toLowerCase()
  const found = (MeasurementTypes as string[]).find((t) => t.toLowerCase() === normalized)
  return (found as MeasurementTypeStr) ?? null
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value))
  if (Number.isNaN(n)) return null
  return n
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const url = new URL(request.url)
    const latest = url.searchParams.get('latest') === 'true'
    const typeParam = url.searchParams.get('type')
    const limitParam = url.searchParams.get('limit')
    const limit = Number.isFinite(Number(limitParam)) ? Math.max(1, Math.min(100, parseInt(String(limitParam), 10))) : 20

    if (latest) {
      const types = MeasurementTypes
      const results: Record<string, any> = {}
      await Promise.all(
        types.map(async (t) => {
          const rows = await prisma.$queryRaw<Array<{
            id: string
            userId: string
            type: string
            value: number
            unit: string | null
            recordedAt: Date
            notes: string | null
          }>>`
            SELECT "id","userId","type","value","unit","recordedAt","notes"
            FROM "public"."measurements"
            WHERE "userId" = ${session.user.id} AND "type" = ${t as string}
            ORDER BY "recordedAt" DESC
            LIMIT 1
          `
          const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
          results[t as string] = row ?? null
        })
      )
      return NextResponse.json({ latest: results })
    }

    if (typeParam) {
      const type = parseMeasurementType(typeParam)
      if (!type) {
        return NextResponse.json({ error: 'Geçersiz ölçüm tipi' }, { status: 400 })
      }
      const rows = await prisma.$queryRaw<Array<{
        id: string
        userId: string
        type: string
        value: number
        unit: string | null
        recordedAt: Date
        notes: string | null
      }>>`
        SELECT "id","userId","type","value","unit","recordedAt","notes"
        FROM "public"."measurements"
        WHERE "userId" = ${session.user.id} AND "type" = ${type as string}
        ORDER BY "recordedAt" DESC
        LIMIT ${limit}
      `
      return NextResponse.json(rows)
    }

    const rows = await prisma.$queryRaw<Array<{
      id: string
      userId: string
      type: string
      value: number
      unit: string | null
      recordedAt: Date
      notes: string | null
    }>>`
      SELECT "id","userId","type","value","unit","recordedAt","notes"
      FROM "public"."measurements"
      WHERE "userId" = ${session.user.id}
      ORDER BY "recordedAt" DESC
      LIMIT 100
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Measurements fetch error:', error)
    return NextResponse.json({ error: 'Ölçümler alınırken bir hata oluştu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const body = await request.json()
    const type = parseMeasurementType(body?.type)
    if (!type) {
      return NextResponse.json({ error: 'Geçersiz ölçüm tipi' }, { status: 400 })
    }

    const numericValue = toNumber(body?.value)
    if (numericValue === null) {
      return NextResponse.json({ error: 'Geçersiz ölçüm değeri' }, { status: 400 })
    }

    const unit: string | null =
      typeof body?.unit === 'string' && body.unit.trim() ? String(body.unit).trim() : null
    const notes: string | null =
      typeof body?.notes === 'string' ? (body.notes.trim() ? body.notes.trim() : null) : null

    let recordedAt: Date | undefined = undefined
    if (body?.recordedAt) {
      const d = new Date(body.recordedAt)
      if (!Number.isNaN(d.getTime())) {
        recordedAt = d
      }
    }

    const finalUnit = unit ?? (type === 'weight' ? 'kg' : 'cm')

    // Build dynamic SQL for recordedAt optional
    const baseSql = `
      INSERT INTO "public"."measurements"
        ("userId","type","value","unit","notes"${recordedAt ? ',"recordedAt"' : ''})
      VALUES
        ($1, $2::"MeasurementType", $3, $4, $5${recordedAt ? ',$6' : ''})
      RETURNING "id","userId","type","value","unit","recordedAt","notes"
    `
    const params: any[] = recordedAt
      ? [session.user.id, type as string, numericValue, finalUnit, notes, recordedAt]
      : [session.user.id, type as string, numericValue, finalUnit, notes]

    // @ts-ignore
    const rows = await prisma.$queryRawUnsafe(baseSql, ...params)
    const created = Array.isArray(rows) && rows.length > 0 ? rows[0] : null

    if (created?.type === 'weight') {
      try {
        await prisma.userProfile.update({
          where: { userId: session.user.id },
          data: { weight: numericValue },
        })
      } catch (profileUpdateError) {
        console.error('Ölçüm sonrası profil kilosu güncellenemedi:', profileUpdateError)
      }
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Measurement create error:', error)
    return NextResponse.json({ error: 'Ölçüm oluşturulurken bir hata oluştu' }, { status: 500 })
  }
}
