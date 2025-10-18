import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

type AdminUser = {
  id?: string | null
  email?: string | null
  role?: string | null
}

const parseArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }
  return []
}

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as AdminUser | undefined

  if (!user || user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const packages = await prisma.fitnessPackage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ packages })
  } catch (error) {
    console.error("Admin packages fetch error:", error)
    return NextResponse.json({ error: "Paketler yüklenemedi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response
  const admin = auth.user

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const slugInput = typeof body.slug === "string" ? body.slug.trim() : ""
    const headline = typeof body.headline === "string" ? body.headline.trim() : null
    const description = typeof body.description === "string" ? body.description.trim() : null
    const price =
      typeof body.price === "number"
        ? Math.max(0, Math.floor(body.price))
        : typeof body.price === "string"
        ? Math.max(0, Number.parseInt(body.price, 10) || 0)
        : 0
    const originalPrice =
      typeof body.originalPrice === "number"
        ? Math.max(0, Math.floor(body.originalPrice))
        : typeof body.originalPrice === "string"
        ? Math.max(0, Number.parseInt(body.originalPrice, 10) || 0)
        : null
    const durationInDays =
      typeof body.durationInDays === "number"
        ? Math.max(1, Math.floor(body.durationInDays))
        : typeof body.durationInDays === "string"
        ? Math.max(1, Number.parseInt(body.durationInDays, 10) || 30)
        : 30
    const currency = typeof body.currency === "string" && body.currency.trim().length === 3 ? body.currency.trim().toUpperCase() : "TRY"
    const isPopular = typeof body.isPopular === "boolean" ? body.isPopular : false
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true
    const themeColor = typeof body.themeColor === "string" ? body.themeColor.trim() || null : null
    const iconName = typeof body.iconName === "string" ? body.iconName.trim() || null : null
    const features = parseArray(body.features)
    const notIncluded = parseArray(body.notIncluded)

    if (!name) {
      return NextResponse.json({ error: "Paket adı zorunludur" }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ error: "Paket fiyatı zorunludur" }, { status: 400 })
    }

    const slug = slugInput ? normalizeSlug(slugInput) : normalizeSlug(name)
    if (!slug) {
      return NextResponse.json({ error: "Slug oluşturulamadı" }, { status: 400 })
    }

    const created = await prisma.fitnessPackage.create({
      data: {
        slug,
        name,
        headline,
        description,
        price,
        originalPrice,
        currency,
        durationInDays,
        isPopular,
        isActive,
        themeColor,
        iconName,
        features,
        notIncluded,
      },
    })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Paket oluşturuldu",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          packageId: created.id,
          name: created.name,
        },
      },
    })

    return NextResponse.json({ package: created }, { status: 201 })
  } catch (error) {
    console.error("Admin package create error:", error)
    return NextResponse.json({ error: "Paket oluşturulamadı" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response
  const admin = auth.user

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const id = typeof body.id === "string" ? body.id.trim() : ""
    if (!id) {
      return NextResponse.json({ error: "Paket bulunamadı" }, { status: 400 })
    }

    const existing = await prisma.fitnessPackage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : existing.name
    const slugInput = typeof body.slug === "string" ? body.slug.trim() : existing.slug
    const headline = typeof body.headline === "string" ? body.headline.trim() : existing.headline
    const description = typeof body.description === "string" ? body.description.trim() : existing.description
    const price =
      typeof body.price === "number"
        ? Math.max(0, Math.floor(body.price))
        : typeof body.price === "string"
        ? Math.max(0, Number.parseInt(body.price, 10) || existing.price)
        : existing.price
    const originalPrice =
      typeof body.originalPrice === "number"
        ? Math.max(0, Math.floor(body.originalPrice))
        : typeof body.originalPrice === "string"
        ? Math.max(0, Number.parseInt(body.originalPrice, 10) || 0)
        : existing.originalPrice
    const durationInDays =
      typeof body.durationInDays === "number"
        ? Math.max(1, Math.floor(body.durationInDays))
        : typeof body.durationInDays === "string"
        ? Math.max(1, Number.parseInt(body.durationInDays, 10) || existing.durationInDays)
        : existing.durationInDays
    const currency =
      typeof body.currency === "string" && body.currency.trim().length === 3
        ? body.currency.trim().toUpperCase()
        : existing.currency
    const isPopular = typeof body.isPopular === "boolean" ? body.isPopular : existing.isPopular
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive
    const themeColor =
      typeof body.themeColor === "string" ? body.themeColor.trim() || null : existing.themeColor
    const iconName =
      typeof body.iconName === "string" ? body.iconName.trim() || null : existing.iconName
    const features = body.features !== undefined ? parseArray(body.features) : existing.features
    const notIncluded =
      body.notIncluded !== undefined ? parseArray(body.notIncluded) : existing.notIncluded

    const slug = slugInput ? normalizeSlug(slugInput) : normalizeSlug(name)
    if (!slug) {
      return NextResponse.json({ error: "Geçersiz slug" }, { status: 400 })
    }

    const updated = await prisma.fitnessPackage.update({
      where: { id },
      data: {
        slug,
        name,
        headline,
        description,
        price,
        originalPrice,
        currency,
        durationInDays,
        isPopular,
        isActive,
        themeColor,
        iconName,
        features,
        notIncluded,
      },
    })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Paket güncellendi",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          packageId: updated.id,
          name: updated.name,
        },
      },
    })

    return NextResponse.json({ package: updated })
  } catch (error) {
    console.error("Admin package update error:", error)
    return NextResponse.json({ error: "Paket güncellenemedi" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response
  const admin = auth.user

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Paket belirtilmedi" }, { status: 400 })
    }

    const existing = await prisma.fitnessPackage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 })
    }

    await prisma.fitnessPackage.delete({ where: { id } })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Paket silindi",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          packageId: existing.id,
          name: existing.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin package delete error:", error)
    return NextResponse.json({ error: "Paket silinemedi" }, { status: 500 })
  }
}
