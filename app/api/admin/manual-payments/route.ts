import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

type AdminUser = {
  id?: string | null
  email?: string | null
  role?: string | null
}

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as AdminUser | undefined

  if (!user || user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }) }
  }

  return { user }
}

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "")

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const accounts = await prisma.manualPaymentAccount.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    })

    return NextResponse.json({
      accounts,
    })
  } catch (error) {
    console.error("Manual payment accounts fetch error:", error)
    return NextResponse.json({ error: "Havale hesapları yüklenemedi" }, { status: 500 })
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

    const bankName = normalizeString(body.bankName)
    const accountName = normalizeString(body.accountName)
    const iban = normalizeString(body.iban)
    const accountNumber = normalizeString(body.accountNumber)
    const branchName = normalizeString(body.branchName)
    const description = normalizeString(body.description)
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true
    const sortOrder =
      typeof body.sortOrder === "number"
        ? Math.max(0, Math.floor(body.sortOrder))
        : typeof body.sortOrder === "string"
        ? Math.max(0, Number.parseInt(body.sortOrder, 10) || 0)
        : 0

    if (!bankName) {
      return NextResponse.json({ error: "Banka adı zorunludur" }, { status: 400 })
    }

    if (!accountName) {
      return NextResponse.json({ error: "Hesap adı zorunludur" }, { status: 400 })
    }

    if (!iban) {
      return NextResponse.json({ error: "IBAN zorunludur" }, { status: 400 })
    }

    const created = await prisma.manualPaymentAccount.create({
      data: {
        bankName,
        accountName,
        iban,
        accountNumber: accountNumber || null,
        branchName: branchName || null,
        description: description || null,
        isActive,
        sortOrder,
      },
    })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Manuel ödeme hesabı oluşturuldu",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          accountId: created.id,
          bankName: created.bankName,
          isActive: created.isActive,
        },
      },
    })

    return NextResponse.json({ account: created }, { status: 201 })
  } catch (error) {
    console.error("Manual payment account create error:", error)
    return NextResponse.json({ error: "Havale hesabı oluşturulamadı" }, { status: 500 })
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

    const id = normalizeString(body.id)
    if (!id) {
      return NextResponse.json({ error: "Geçersiz hesap" }, { status: 400 })
    }

    const existing = await prisma.manualPaymentAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 404 })
    }

    const bankName = normalizeString(body.bankName) || existing.bankName
    const accountName = normalizeString(body.accountName) || existing.accountName
    const iban = normalizeString(body.iban) || existing.iban
    const accountNumber = normalizeString(body.accountNumber)
    const branchName = normalizeString(body.branchName)
    const description = normalizeString(body.description)
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : typeof body.isActive === "string"
        ? body.isActive.toLowerCase() === "true"
        : existing.isActive
    const sortOrder =
      typeof body.sortOrder === "number"
        ? Math.max(0, Math.floor(body.sortOrder))
        : typeof body.sortOrder === "string"
        ? Math.max(0, Number.parseInt(body.sortOrder, 10) || existing.sortOrder)
        : existing.sortOrder

    const updated = await prisma.manualPaymentAccount.update({
      where: { id },
      data: {
        bankName,
        accountName,
        iban,
        accountNumber: accountNumber ? accountNumber : existing.accountNumber,
        branchName: branchName ? branchName : existing.branchName,
        description: description ? description : existing.description,
        isActive,
        sortOrder,
      },
    })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Manuel ödeme hesabı güncellendi",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          accountId: updated.id,
          bankName: updated.bankName,
          isActive: updated.isActive,
        },
      },
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error("Manual payment account update error:", error)
    return NextResponse.json({ error: "Havale hesabı güncellenemedi" }, { status: 500 })
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
      return NextResponse.json({ error: "Hesap belirtilmedi" }, { status: 400 })
    }

    const existing = await prisma.manualPaymentAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 404 })
    }

    await prisma.manualPaymentAccount.delete({ where: { id } })

    await prisma.adminLog.create({
      data: {
        level: "AUDIT",
        message: "Manuel ödeme hesabı silindi",
        source: "subscription",
        actorId: admin?.id ?? null,
        actorEmail: admin?.email ?? null,
        context: {
          accountId: existing.id,
          bankName: existing.bankName,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Manual payment account delete error:", error)
    return NextResponse.json({ error: "Havale hesabı silinemedi" }, { status: 500 })
  }
}
