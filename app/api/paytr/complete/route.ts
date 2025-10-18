import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { createPackagePurchase, getRemainingDays } from "@/lib/subscription"

type CompletionBody = {
  merchantOid?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as CompletionBody | null
    const merchantOid =
      body && typeof body.merchantOid === "string" && body.merchantOid.trim().length > 0
        ? body.merchantOid.trim()
        : null

    if (!merchantOid) {
      return NextResponse.json({ error: "Geçersiz işlem kodu" }, { status: 400 })
    }

    const log = await prisma.paytrLog.findFirst({
      where: {
        action: "payment.initiated",
        message: merchantOid,
        userId,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!log) {
      return NextResponse.json({ error: "İşlem kaydı bulunamadı" }, { status: 404 })
    }

    if (log.status === "completed") {
      return NextResponse.json({ message: "İşlem daha önce tamamlanmış" }, { status: 200 })
    }

    const payload = (log.payload ?? {}) as Record<string, unknown>
    const packageId =
      typeof payload.packageId === "string" && payload.packageId.trim().length > 0
        ? payload.packageId.trim()
        : null

    if (!packageId) {
      return NextResponse.json({ error: "Paket bilgisi bulunamadı" }, { status: 400 })
    }

    const fitnessPackage = await prisma.fitnessPackage.findFirst({
      where: {
        id: packageId,
        isActive: true,
      },
    })

    if (!fitnessPackage) {
      return NextResponse.json({ error: "Paket bulunamadı veya pasif" }, { status: 404 })
    }

    const purchase = await createPackagePurchase(userId, fitnessPackage)

    await prisma.paytrLog.update({
      where: { id: log.id },
      data: {
        status: "completed",
        payload: {
          ...payload,
          purchaseId: purchase.id,
          completedAt: new Date().toISOString(),
        },
      },
    })

    await prisma.paytrLog.create({
      data: {
        action: "payment.completed",
        status: "success",
        message: merchantOid,
        userId,
        userEmail: session.user?.email ?? null,
        payload: {
          packageId,
          packageName: fitnessPackage.name,
          price: fitnessPackage.price,
          currency: fitnessPackage.currency,
          purchaseId: purchase.id,
        },
        settingId: log.settingId,
      },
    })

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        status: purchase.status,
        startsAt: purchase.startsAt,
        expiresAt: purchase.expiresAt,
        remainingDays: getRemainingDays(purchase.expiresAt),
        package: {
          id: fitnessPackage.id,
          name: fitnessPackage.name,
          price: fitnessPackage.price,
          currency: fitnessPackage.currency,
          durationInDays: fitnessPackage.durationInDays,
        },
      },
    })
  } catch (error) {
    console.error("PayTR completion error:", error)
    return NextResponse.json({ error: "Paket aktivasyonu tamamlanamadı" }, { status: 500 })
  }
}
