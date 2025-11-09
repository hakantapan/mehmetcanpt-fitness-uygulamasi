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
    console.log("[Mail Settings API] PUT request received")
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      console.log("[Mail Settings API] Invalid request body")
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    console.log("[Mail Settings API] Request body:", { ...body, password: body.password ? "***" : "" })

    // Host alanından ssl:// veya tls:// öneklerini temizle
    let host = typeof body.host === "string" ? body.host.trim() : ""
    host = host.replace(/^(ssl|tls):\/\//i, "").replace(/^\/\//, "")
    const port = Number(body.port)
    const secure = Boolean(body.secure)
    const username = typeof body.username === "string" && body.username.trim().length > 0 ? body.username.trim() : null
    const rawPassword = typeof body.password === "string" ? body.password.trim() : ""
    const fromName = typeof body.fromName === "string" ? body.fromName.trim() : ""
    const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : ""
    const replyTo = typeof body.replyTo === "string" && body.replyTo.trim().length > 0 ? body.replyTo.trim() : null
    const testConnection = body.test === true

    console.log("[Mail Settings API] Parsed values:", { host, port, secure, username: username ? "***" : null, fromName, fromEmail, testConnection })

    if (!host || Number.isNaN(port) || port <= 0 || !fromName || !fromEmail) {
      console.log("[Mail Settings API] Validation failed")
      return NextResponse.json({ error: "Host, port, gönderen adı ve e-posta zorunludur" }, { status: 400 })
    }

    const latest = await prisma.mailSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })

    const password = rawPassword && rawPassword !== "********" ? rawPassword : latest?.password ?? null

    console.log("[Mail Settings API] Creating mail setting...")
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
    console.log("[Mail Settings API] Mail setting created:", updated.id)

    if (testConnection) {
      console.log("[Mail Settings API] Testing SMTP connection...")
      // Test için geçici transporter oluştur
      const nodemailer = await import("nodemailer")
      const testTransporter = nodemailer.default.createTransport({
        host,
        port,
        secure,
        auth: username && password ? { user: username, pass: password } : undefined,
      })

      try {
        await testTransporter.verify()
        console.log("[Mail Settings API] SMTP connection test successful")
        // Test başarılıysa lastTested alanını güncelle
        const testDate = new Date()
        await prisma.mailSetting.update({
          where: { id: updated.id },
          data: { lastTested: testDate },
        })
        
        const response = {
          success: true,
          updatedAt: updated.updatedAt,
          testResult: {
            success: true,
            testedAt: testDate.toISOString(),
            message: `SMTP sunucusuna başarıyla bağlanıldı: ${host}:${port}`,
          },
        }
        console.log("[Mail Settings API] Returning success response:", JSON.stringify(response, null, 2))
        return NextResponse.json(response)
      } catch (error) {
        console.error("[Mail Settings API] SMTP connection test failed:", error)
        let errorMessage = error instanceof Error ? error.message : String(error)
        
        // Kullanıcı dostu hata mesajları
        if (errorMessage.includes("EBADNAME") || errorMessage.includes("ssl://") || errorMessage.includes("tls://")) {
          errorMessage = "SMTP host adresi geçersiz. Host alanına sadece domain adresini girin (örn: smtp.gmail.com). 'ssl://' veya 'tls://' öneklerini kullanmayın. SSL/TLS için 'Güvenli Bağlantı' seçeneğini işaretleyin."
        } else if (errorMessage.includes("EAUTH")) {
          errorMessage = "Kullanıcı adı veya şifre hatalı. Lütfen SMTP kimlik bilgilerinizi kontrol edin."
        } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED")) {
          errorMessage = "SMTP sunucusuna bağlanılamadı. Host ve port bilgilerini kontrol edin."
        } else if (errorMessage.includes("ENOTFOUND")) {
          errorMessage = "SMTP host adresi bulunamadı. Host adresini kontrol edin."
        }
        
        const response = {
          warning: "Ayarlar kaydedildi ancak SMTP doğrulaması başarısız oldu.",
          error: errorMessage || "SMTP bağlantısı doğrulanamadı",
        }
        console.log("[Mail Settings API] Returning warning response:", JSON.stringify(response, null, 2))
        return NextResponse.json(response, { status: 200 })
      }
    }

    const response = { success: true, updatedAt: updated.updatedAt }
    console.log("[Mail Settings API] Returning save response:", JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error("[Mail Settings API] Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Mail ayarları kaydedilemedi: ${errorMessage}` }, { status: 500 })
  }
}
