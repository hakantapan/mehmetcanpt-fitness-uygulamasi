import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

const PAYTR_IFRAME_ENDPOINT = "https://www.paytr.com/odeme/api/get-token"

type CheckoutBody = {
  packageId?: unknown
  installmentCount?: unknown
  source?: unknown
}

type UserProfileLite = {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  address?: string | null
}

const INTL_TR = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
})

const getBaseAppUrl = () =>
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000"

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const [ip] = forwarded.split(",").map((value) => value.trim())
    if (ip) return ip
  }
  return request.ip ?? request.headers.get("x-real-ip") ?? "127.0.0.1"
}

const formatKurus = (amount: number) => Math.round(amount).toString()

const normalizeInstallment = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(12, Math.trunc(value))).toString()
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.min(12, parsed)).toString()
    }
  }
  return "0"
}

const buildPaytrHash = (params: {
  merchantId: string
  userIp: string
  merchantOid: string
  email: string
  paymentAmount: string
  paymentType: string
  installmentCount: string
  currency: string
  testMode: string
  non3d: string
  merchantSalt: string
  merchantKey: string
}) => {
  const hashStr = [
    params.merchantId,
    params.userIp,
    params.merchantOid,
    params.email,
    params.paymentAmount,
    params.paymentType,
    params.installmentCount,
    params.currency,
    params.testMode,
    params.non3d,
    params.merchantSalt,
  ].join("")

  return crypto.createHmac("sha256", params.merchantKey).update(hashStr, "utf8").digest("base64")
}

const buildUserBasket = (label: string, price: string) =>
  Buffer.from(JSON.stringify([[label, "1", price]])).toString("base64")

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as CheckoutBody | null
    const packageId =
      body && typeof body.packageId === "string" && body.packageId.trim().length > 0
        ? body.packageId.trim()
        : null

    if (!packageId) {
      return NextResponse.json({ error: "Geçersiz paket bilgisi" }, { status: 400 })
    }

    const [fitnessPackage, paytrSetting, user] = await Promise.all([
      prisma.fitnessPackage.findFirst({
        where: {
          id: packageId,
          isActive: true,
        },
      }),
      prisma.paytrSetting.findFirst({
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
            },
          },
        },
      }),
    ])

    if (!fitnessPackage) {
      return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 })
    }

    if (!paytrSetting || !paytrSetting.merchantId || !paytrSetting.merchantKey || !paytrSetting.merchantSalt) {
      return NextResponse.json({ error: "Ödeme altyapısı yapılandırılmamış" }, { status: 503 })
    }

    if (!user?.email) {
      return NextResponse.json({ error: "Kullanıcı e-posta bilgisi bulunamadı" }, { status: 400 })
    }

    const profile: UserProfileLite | null = user.profile ?? null
    const customerName = profile
      ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Müşteri"
      : "Müşteri"
    const customerPhone = profile?.phone?.replace(/\D+/g, "") || "5555555555"
    const customerAddress =
      profile?.address?.trim() || "Adres belirtilmedi, lütfen hesap ayarlarınızdan güncelleyiniz."

    const userIp = getClientIp(request)
    const currency = paytrSetting.currency && paytrSetting.currency.trim().length > 0 ? paytrSetting.currency : "TL"
    const testMode = paytrSetting.mode === "TEST" ? "1" : "0"
    const non3d = paytrSetting.non3d ? "1" : "0"
    const installmentCount = normalizeInstallment(body?.installmentCount)
    const paymentType = "card"

    const paymentAmountKurus = formatKurus(Math.max(0, fitnessPackage.price * 100))
    const basket = buildUserBasket(fitnessPackage.name, paymentAmountKurus)

    const merchantOid = `pkg_${fitnessPackage.id}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`

    const paytrToken = buildPaytrHash({
      merchantId: paytrSetting.merchantId,
      userIp,
      merchantOid,
      email: user.email,
      paymentAmount: paymentAmountKurus,
      paymentType,
      installmentCount,
      currency,
      testMode,
      non3d,
      merchantSalt: paytrSetting.merchantSalt,
      merchantKey: paytrSetting.merchantKey,
    })

    const okUrl =
      paytrSetting.merchantOkUrl && paytrSetting.merchantOkUrl.trim().length > 0
        ? paytrSetting.merchantOkUrl
        : `${getBaseAppUrl()}/paket-satin-al/odeme-sonucu?status=success&merchant_oid=${merchantOid}`

    const failUrl =
      paytrSetting.merchantFailUrl && paytrSetting.merchantFailUrl.trim().length > 0
        ? paytrSetting.merchantFailUrl
        : `${getBaseAppUrl()}/paket-satin-al/odeme-sonucu?status=failed&merchant_oid=${merchantOid}`

    const payload = new URLSearchParams({
      merchant_id: paytrSetting.merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: user.email,
      payment_amount: paymentAmountKurus,
      payment_type: paymentType,
      installment_count: installmentCount,
      currency,
      test_mode: testMode,
      non_3d: non3d,
      merchant_ok_url: okUrl,
      merchant_fail_url: failUrl,
      user_name: customerName,
      user_address: customerAddress,
      user_phone: customerPhone,
      user_basket: basket,
      debug_on: paytrSetting.iframeDebug ? "1" : "0",
      lang: paytrSetting.language ?? "tr",
      paytr_token: paytrToken,
    })

    if (paytrSetting.maxInstallment && paytrSetting.maxInstallment > 0) {
      payload.set("max_installment", String(paytrSetting.maxInstallment))
    }

    if (paytrSetting.paymentMethods) {
      payload.set("payment_methods", JSON.stringify(paytrSetting.paymentMethods))
    }

    if (paytrSetting.installmentConfig) {
      payload.set("installment_commission", JSON.stringify(paytrSetting.installmentConfig))
    }

    try {
      const paytrResponse = await fetch(PAYTR_IFRAME_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      })

      const data = await paytrResponse.json().catch(async () => {
        const text = await paytrResponse.text().catch(() => null)
        return typeof text === "string" ? { status: "failed", reason: text } : null
      })

      if (!data || typeof data !== "object") {
        throw new Error("PayTR beklenmeyen yanıt döndürdü")
      }

      if (data.status !== "success" || typeof data.token !== "string") {
        const reason =
          typeof data.reason === "string" && data.reason.trim().length > 0
            ? data.reason
            : "Ödeme başlatılamadı"

        await prisma.paytrLog.create({
          data: {
            action: "payment.initiated",
            status: "failed",
            message: merchantOid,
            ipAddress: userIp,
            userId,
            userEmail: user.email,
            payload: {
              packageId,
              packageName: fitnessPackage.name,
              price: fitnessPackage.price,
              priceFormatted: INTL_TR.format(fitnessPackage.price),
              currency,
              installmentCount,
              merchantOid,
              source: body?.source ?? null,
            },
            error: {
              reason,
              response: data,
            },
            settingId: paytrSetting.id,
          },
        })

        return NextResponse.json({ error: reason }, { status: 502 })
      }

      await prisma.paytrLog.create({
        data: {
          action: "payment.initiated",
          status: "success",
          message: merchantOid,
          ipAddress: userIp,
          userId,
          userEmail: user.email,
          payload: {
            packageId,
            packageName: fitnessPackage.name,
            price: fitnessPackage.price,
            priceFormatted: INTL_TR.format(fitnessPackage.price),
            currency,
            installmentCount,
            merchantOid,
            token: data.token,
            source: body?.source ?? null,
          },
          settingId: paytrSetting.id,
        },
      })

      const iframeUrl = `https://www.paytr.com/odeme/guvenli/${data.token}`

      return NextResponse.json({
        token: data.token,
        iframeUrl,
        merchantOid,
        package: {
          id: fitnessPackage.id,
          name: fitnessPackage.name,
          price: fitnessPackage.price,
          currency,
          durationInDays: fitnessPackage.durationInDays,
        },
      })
    } catch (error) {
      console.error("PayTR iframe token error:", error)
      await prisma.paytrLog.create({
        data: {
          action: "payment.initiated",
          status: "error",
          message: merchantOid,
          ipAddress: userIp,
          userId,
          userEmail: user.email,
          payload: {
            packageId,
            packageName: fitnessPackage.name,
            price: fitnessPackage.price,
            currency,
            installmentCount,
            merchantOid,
            source: body?.source ?? null,
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          settingId: paytrSetting.id,
        },
      })

      return NextResponse.json(
        { error: "Ödeme ekranı oluşturulamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("PayTR checkout init error:", error)
    return NextResponse.json({ error: "Ödeme başlatılırken bir hata oluştu" }, { status: 500 })
  }
}
