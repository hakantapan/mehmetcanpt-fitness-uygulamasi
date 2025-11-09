import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sendMail } from "@/lib/mail"
import { prisma } from "@/lib/prisma"
import { Prisma, type LogLevel } from "@prisma/client"

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return null
}

export async function POST(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const testEmail = typeof body.email === "string" ? body.email.trim() : ""
    
    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi giriniz" }, { status: 400 })
    }

    // SMTP ayarlarının varlığını kontrol et
    const mailSetting = await prisma.mailSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })

    if (!mailSetting || !mailSetting.host || !mailSetting.fromEmail) {
      return NextResponse.json(
        { error: "SMTP ayarları yapılandırılmamış. Lütfen önce mail ayarlarını kaydedin." },
        { status: 400 },
      )
    }

    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test E-postası</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #DC1D24 0%, #B8151C 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Test E-postası</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">Merhaba,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Bu bir test e-postasıdır. Eğer bu e-postayı alıyorsanız, SMTP ayarlarınız doğru çalışıyor demektir.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #DC1D24; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Gönderim Zamanı:</strong> ${new Date().toLocaleString("tr-TR", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric", 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </p>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Bu e-posta Mehmetcanpt Uzaktan Eğitim sisteminden otomatik olarak gönderilmiştir.
            </p>
          </div>
        </body>
      </html>
    `

    const testEmailText = `
Test E-postası

Merhaba,

Bu bir test e-postasıdır. Eğer bu e-postayı alıyorsanız, SMTP ayarlarınız doğru çalışıyor demektir.

Gönderim Zamanı: ${new Date().toLocaleString("tr-TR")}

Bu e-posta Mehmetcanpt Uzaktan Eğitim sisteminden otomatik olarak gönderilmiştir.
    `

    try {
      console.log("[Test Email API] Sending test email to:", testEmail)
      console.log("[Test Email API] Using mail settings:", {
        host: mailSetting.host,
        port: mailSetting.port,
        secure: mailSetting.secure,
        fromEmail: mailSetting.fromEmail,
        fromName: mailSetting.fromName,
      })
      
      const result = await sendMail({
        to: testEmail,
        subject: "Test E-postası - SMTP Ayarları",
        html: testEmailHtml,
        text: testEmailText,
      })

      console.log("[Test Email API] sendMail result:", JSON.stringify(result, null, 2))

      if (!result) {
        console.error("[Test Email API] sendMail returned null/undefined")
        throw new Error("E-posta gönderildi ancak yanıt alınamadı")
      }

      const messageId = (result as any)?.messageId || (result as any)?.response || null
      const accepted = (result as any)?.accepted || []
      const rejected = (result as any)?.rejected || []
      const response = (result as any)?.response || null
      
      console.log("[Test Email API] Message ID:", messageId)
      console.log("[Test Email API] Accepted recipients:", accepted)
      console.log("[Test Email API] Rejected recipients:", rejected)
      console.log("[Test Email API] SMTP Response:", response)

      // Mail logunu kaydet
      const session = await getServerSession(authOptions)
      const adminUser = session?.user
      
      try {
        await prisma.adminLog.create({
          data: {
            level: rejected.length > 0 || accepted.length === 0 ? "WARN" : "AUDIT",
            message: rejected.length > 0 
              ? `Test e-postası gönderildi ancak bazı alıcılar reddedildi: ${rejected.join(", ")}`
              : accepted.length === 0
              ? `Test e-postası gönderildi ancak hiçbir alıcı kabul edilmedi`
              : `Test e-postası ${testEmail} adresine başarıyla gönderildi`,
            actorId: adminUser?.id ?? undefined,
            actorEmail: adminUser?.email ?? undefined,
            source: "mail",
            context: {
              type: "Test e-postası",
              recipients: [testEmail],
              subject: "Test E-postası - SMTP Ayarları",
              html: testEmailHtml,
              text: testEmailText,
              delivery: {
                messageId: messageId,
                accepted: accepted,
                rejected: rejected,
                response: response,
              },
            } as Prisma.InputJsonValue,
          },
        })
      } catch (logError) {
        console.error("[Test Email API] Failed to save mail log:", logError)
        // Log hatası mail gönderimini engellemez
      }

      // Eğer mail reddedildiyse uyarı ver
      if (rejected.length > 0) {
        return NextResponse.json({
          success: false,
          warning: `E-posta SMTP sunucusuna gönderildi ancak bazı alıcılar reddedildi.`,
          message: `Test e-postası gönderildi. Reddedilen alıcılar: ${rejected.join(", ")}`,
          messageId: messageId,
          accepted: accepted,
          rejected: rejected,
        }, { status: 200 })
      }

      // Eğer accepted listesi boşsa uyarı ver
      if (accepted.length === 0) {
        return NextResponse.json({
          success: false,
          warning: `E-posta SMTP sunucusuna gönderildi ancak hiçbir alıcı kabul edilmedi.`,
          message: `Test e-postası gönderildi ancak alıcı kabul edilmedi.`,
          messageId: messageId,
          accepted: accepted,
          rejected: rejected,
        }, { status: 200 })
      }

      return NextResponse.json({
        success: true,
        message: `Test e-postası ${testEmail} adresine başarıyla gönderildi.`,
        messageId: messageId,
        accepted: accepted,
        rejected: rejected,
      })
    } catch (mailError) {
      console.error("[Test Email API] Test email send error:", mailError)
      const errorMessage = mailError instanceof Error ? mailError.message : String(mailError)
      console.error("[Test Email API] Error details:", {
        name: mailError instanceof Error ? mailError.name : "Unknown",
        message: errorMessage,
        stack: mailError instanceof Error ? mailError.stack : undefined,
      })
      
      // Hata logunu kaydet
      const session = await getServerSession(authOptions)
      const adminUser = session?.user
      
      try {
        await prisma.adminLog.create({
          data: {
            level: "ERROR",
            message: `Test e-postası gönderilemedi: ${errorMessage}`,
            actorId: adminUser?.id ?? undefined,
            actorEmail: adminUser?.email ?? undefined,
            source: "mail",
            context: {
              type: "Test e-postası",
              recipients: [testEmail],
              subject: "Test E-postası - SMTP Ayarları",
              html: testEmailHtml,
              text: testEmailText,
              error: {
                name: mailError instanceof Error ? mailError.name : "Unknown",
                message: errorMessage,
              },
            } as Prisma.InputJsonValue,
          },
        })
      } catch (logError) {
        console.error("[Test Email API] Failed to save error log:", logError)
      }
      
      return NextResponse.json(
        { error: `E-posta gönderilirken hata oluştu: ${errorMessage}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Test email route error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Test e-postası gönderilemedi: ${errorMessage}` },
      { status: 500 },
    )
  }
}

