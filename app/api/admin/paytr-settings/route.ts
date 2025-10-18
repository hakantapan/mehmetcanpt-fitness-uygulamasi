import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PaytrMode } from "@prisma/client"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { testPaytrConnection } from "@/lib/paytr"

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

function parseMode(raw: unknown, fallback: PaytrMode = PaytrMode.TEST): PaytrMode {
  if (typeof raw !== "string") return fallback
  const upper = raw.trim().toUpperCase()
  if (upper === "LIVE") return PaytrMode.LIVE
  return PaytrMode.TEST
}

function sanitizeSetting(setting: { merchantKey: string; merchantSalt: string }) {
  return {
    merchantKey: setting.merchantKey ? "********" : "",
    merchantSalt: setting.merchantSalt ? "********" : "",
  }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const [ip] = forwarded.split(",").map((value) => value.trim())
    if (ip) return ip
  }
  return request.ip ?? request.headers.get("x-real-ip") ?? "unknown"
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response

  try {
    const limitParam = request.nextUrl.searchParams.get("limit")
    const logLimit = Math.min(100, Math.max(5, limitParam ? Number(limitParam) || 20 : 20))

    const [setting, logs] = await Promise.all([
      prisma.paytrSetting.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.paytrLog.findMany({
        orderBy: { createdAt: "desc" },
        take: logLimit,
      }),
    ])

    if (!setting) {
      return NextResponse.json({ setting: null, logs: [] })
    }

    const secretPlaceholders = sanitizeSetting(setting)

    return NextResponse.json({
      setting: {
        id: setting.id,
        mode: setting.mode,
        merchantId: setting.merchantId,
        merchantKey: secretPlaceholders.merchantKey,
        merchantSalt: secretPlaceholders.merchantSalt,
        merchantOkUrl: setting.merchantOkUrl,
        merchantFailUrl: setting.merchantFailUrl,
        merchantWebhookUrl: setting.merchantWebhookUrl,
        currency: setting.currency,
        language: setting.language,
        iframeDebug: setting.iframeDebug,
        non3d: setting.non3d,
        maxInstallment: setting.maxInstallment,
        paymentMethods: setting.paymentMethods,
        installmentConfig: setting.installmentConfig,
        extraConfig: setting.extraConfig,
        lastSyncedAt: setting.lastSyncedAt,
        updatedAt: setting.updatedAt,
        updatedByEmail: setting.updatedByEmail,
      },
      logs,
    })
  } catch (error) {
    console.error("PayTR settings fetch error:", error)
    return NextResponse.json({ error: "PayTR ayarları yüklenemedi" }, { status: 500 })
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

    const mode = parseMode(body.mode)
    const merchantId = typeof body.merchantId === "string" ? body.merchantId.trim() : ""
    const merchantKeyRaw = typeof body.merchantKey === "string" ? body.merchantKey.trim() : ""
    const merchantSaltRaw = typeof body.merchantSalt === "string" ? body.merchantSalt.trim() : ""
    const merchantOkUrl = typeof body.merchantOkUrl === "string" ? body.merchantOkUrl.trim() || null : null
    const merchantFailUrl = typeof body.merchantFailUrl === "string" ? body.merchantFailUrl.trim() || null : null
    const merchantWebhookUrl =
      typeof body.merchantWebhookUrl === "string" ? body.merchantWebhookUrl.trim() || null : null
    const currency = typeof body.currency === "string" ? body.currency.trim() || "TL" : "TL"
    const language = typeof body.language === "string" ? body.language.trim() || "tr" : "tr"
    const iframeDebug = Boolean(body.iframeDebug)
    const non3d = Boolean(body.non3d)
    const maxInstallment =
      typeof body.maxInstallment === "number"
        ? Math.max(0, Math.min(12, Math.floor(body.maxInstallment)))
        : typeof body.maxInstallment === "string"
        ? Math.max(0, Math.min(12, Number.parseInt(body.maxInstallment, 10) || 0))
        : 0
    const paymentMethods =
      body.paymentMethods && typeof body.paymentMethods === "object" ? body.paymentMethods : undefined
    const installmentConfig =
      body.installmentConfig && typeof body.installmentConfig === "object" ? body.installmentConfig : undefined
    const extraConfig = body.extraConfig && typeof body.extraConfig === "object" ? body.extraConfig : undefined

    if (!merchantId) {
      return NextResponse.json({ error: "Mağaza (merchant) ID zorunludur" }, { status: 400 })
    }

    const existing = await prisma.paytrSetting.findFirst({ orderBy: { updatedAt: "desc" } })

    const merchantKey =
      merchantKeyRaw && merchantKeyRaw !== "********"
        ? merchantKeyRaw
        : existing?.merchantKey
        ? existing.merchantKey
        : ""
    const merchantSalt =
      merchantSaltRaw && merchantSaltRaw !== "********"
        ? merchantSaltRaw
        : existing?.merchantSalt
        ? existing.merchantSalt
        : ""

    if (!merchantKey || !merchantSalt) {
      return NextResponse.json(
        { error: "Merchant key ve merchant salt alanları zorunludur" },
        { status: 400 },
      )
    }

    const data = {
      mode,
      merchantId,
      merchantKey,
      merchantSalt,
      merchantOkUrl,
      merchantFailUrl,
      merchantWebhookUrl,
      currency,
      language,
      iframeDebug,
      non3d,
      maxInstallment,
      paymentMethods: paymentMethods ?? existing?.paymentMethods ?? null,
      installmentConfig: installmentConfig ?? existing?.installmentConfig ?? null,
      extraConfig: extraConfig ?? existing?.extraConfig ?? null,
      updatedById: admin?.id ?? null,
      updatedByEmail: admin?.email ?? null,
    }

    const updated = existing
      ? await prisma.paytrSetting.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.paytrSetting.create({ data })

    await prisma.paytrLog.create({
      data: {
        action: "settings.updated",
        status: "success",
        message: "PayTR ayarları güncellendi",
        payload: {
          mode: updated.mode,
          merchantId: updated.merchantId,
          currency: updated.currency,
          non3d: updated.non3d,
          maxInstallment: updated.maxInstallment,
        },
        userId: admin?.id ?? null,
        userEmail: admin?.email ?? null,
        ipAddress: getClientIp(request),
        settingId: updated.id,
      },
    })

    const secretPlaceholders = sanitizeSetting(updated)

    return NextResponse.json({
      success: true,
      setting: {
        id: updated.id,
        mode: updated.mode,
        merchantId: updated.merchantId,
        merchantKey: secretPlaceholders.merchantKey,
        merchantSalt: secretPlaceholders.merchantSalt,
        merchantOkUrl: updated.merchantOkUrl,
        merchantFailUrl: updated.merchantFailUrl,
        merchantWebhookUrl: updated.merchantWebhookUrl,
        currency: updated.currency,
        language: updated.language,
        iframeDebug: updated.iframeDebug,
        non3d: updated.non3d,
        maxInstallment: updated.maxInstallment,
        paymentMethods: updated.paymentMethods,
        installmentConfig: updated.installmentConfig,
        extraConfig: updated.extraConfig,
        lastSyncedAt: updated.lastSyncedAt,
        updatedAt: updated.updatedAt,
        updatedByEmail: updated.updatedByEmail,
      },
    })
  } catch (error) {
    console.error("PayTR settings update error:", error)
    await prisma.paytrLog.create({
      data: {
        action: "settings.updated",
        status: "error",
        message: "PayTR ayarları güncellenirken hata oluştu",
        error: { message: (error as Error).message },
        ipAddress: getClientIp(request),
      },
    })
    return NextResponse.json({ error: "PayTR ayarları kaydedilemedi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ("response" in auth) return auth.response
  const admin = auth.user

  try {
    const body = await request.json().catch(() => ({}))
    const existing = await prisma.paytrSetting.findFirst({ orderBy: { updatedAt: "desc" } })

    const mode = parseMode(body.mode ?? existing?.mode ?? PaytrMode.TEST)
    const merchantId = (typeof body.merchantId === "string" ? body.merchantId.trim() : "") || existing?.merchantId || ""
    const merchantKey =
      (typeof body.merchantKey === "string" ? body.merchantKey.trim() : "") || existing?.merchantKey || ""
    const merchantSalt =
      (typeof body.merchantSalt === "string" ? body.merchantSalt.trim() : "") || existing?.merchantSalt || ""
    const merchantOkUrl =
      typeof body.merchantOkUrl === "string" ? body.merchantOkUrl.trim() || existing?.merchantOkUrl || null : existing?.merchantOkUrl ?? null
    const merchantFailUrl =
      typeof body.merchantFailUrl === "string"
        ? body.merchantFailUrl.trim() || existing?.merchantFailUrl || null
        : existing?.merchantFailUrl ?? null
    const currency =
      typeof body.currency === "string" ? body.currency.trim() || existing?.currency || "TL" : existing?.currency ?? "TL"
    const iframeDebug =
      typeof body.iframeDebug === "boolean" ? body.iframeDebug : existing?.iframeDebug ?? false
    const non3d = typeof body.non3d === "boolean" ? body.non3d : existing?.non3d ?? false

    if (!merchantId || !merchantKey || !merchantSalt) {
      return NextResponse.json(
        { error: "Test bağlantısı için merchant bilgileri eksik" },
        { status: 400 },
      )
    }

    const result = await testPaytrConnection({
      merchantId,
      merchantKey,
      merchantSalt,
      mode,
      merchantOkUrl: merchantOkUrl ?? undefined,
      merchantFailUrl: merchantFailUrl ?? undefined,
      currency,
      iframeDebug,
      non3d,
    })

    if (result.ok && existing) {
      await prisma.paytrSetting.update({
        where: { id: existing.id },
        data: { lastSyncedAt: new Date() },
      })
    }

    await prisma.paytrLog.create({
      data: {
        action: "settings.test",
        status: result.ok ? "success" : "error",
        message: result.ok ? "PayTR bağlantı testi başarılı" : "PayTR bağlantı testi başarısız",
        payload: {
          mode,
          merchantId,
          currency,
        },
        error: result.ok ? undefined : { reason: result.reason },
        userId: admin?.id ?? null,
        userEmail: admin?.email ?? null,
        ipAddress: getClientIp(request),
        settingId: existing?.id ?? null,
      },
    })

    if (result.ok) {
      return NextResponse.json({ success: true, token: result.token, raw: result.raw })
    }

    return NextResponse.json({ success: false, error: result.reason, raw: result.raw }, { status: 400 })
  } catch (error) {
    console.error("PayTR settings test error:", error)
    await prisma.paytrLog.create({
      data: {
        action: "settings.test",
        status: "error",
        message: "PayTR bağlantı testi sırasında beklenmedik hata",
        error: { message: (error as Error).message },
        ipAddress: getClientIp(request),
      },
    })
    return NextResponse.json({ error: "PayTR bağlantı testi gerçekleştirilemedi" }, { status: 500 })
  }
}
