import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { testMailConnection } from "@/lib/mail"

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const setting = await prisma.mailSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })

    if (!setting) {
      return NextResponse.json({ setting: null })
    }

    return NextResponse.json({
      setting: {
        host: setting.host,
        port: setting.port,
        secure: setting.secure,
        username: setting.username,
        password: setting.password ? "********" : null,
        fromName: setting.fromName,
        fromEmail: setting.fromEmail,
        replyTo: setting.replyTo,
        lastTested: setting.lastTested,
        updatedAt: setting.updatedAt,
      },
    })
  } catch (error) {
    console.error("Mail settings fetch error:", error)
    return NextResponse.json({ error: "Mail ayarları yüklenemedi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const host = typeof body.host === "string" ? body.host.trim() : ""
    const port = Number(body.port)
    const secure = Boolean(body.secure)
    const username = typeof body.username === "string" && body.username.trim().length > 0 ? body.username.trim() : null
    const rawPassword = typeof body.password === "string" ? body.password.trim() : ""
    const fromName = typeof body.fromName === "string" ? body.fromName.trim() : ""
    const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : ""
    const replyTo = typeof body.replyTo === "string" && body.replyTo.trim().length > 0 ? body.replyTo.trim() : null
    const testConnection = body.test === true

    if (!host || Number.isNaN(port) || port <= 0 || !fromName || !fromEmail) {
      return NextResponse.json({ error: "Host, port, gönderen adı ve e-posta zorunludur" }, { status: 400 })
    }

    const latest = await prisma.mailSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })

    const password = rawPassword && rawPassword !== "********" ? rawPassword : latest?.password ?? null

    const updated = await prisma.mailSetting.create({
      data: {
        host,
        port,
        secure,
        username,
        password,
        fromName,
        fromEmail,
        replyTo,
        isActive: true,
      },
    })

    if (testConnection) {
      const ok = await testMailConnection()
      if (!ok) {
        return NextResponse.json({ warning: "Ayarlar kaydedildi ancak SMTP doğrulaması başarısız oldu." })
      }
    }

    return NextResponse.json({ success: true, updatedAt: updated.updatedAt })
  } catch (error) {
    console.error("Mail settings update error:", error)
    return NextResponse.json({ error: "Mail ayarları kaydedilemedi" }, { status: 500 })
  }
}
