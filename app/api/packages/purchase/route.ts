import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { createPackagePurchase, getRemainingDays } from "@/lib/subscription"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const packageId = typeof body?.packageId === "string" ? body.packageId : null

    if (!packageId) {
      return NextResponse.json({ error: "Geçersiz paket bilgisi" }, { status: 400 })
    }

    const fitnessPackage = await prisma.fitnessPackage.findFirst({
      where: {
        id: packageId,
        isActive: true,
      },
    })

    if (!fitnessPackage) {
      return NextResponse.json({ error: "Paket bulunamadı" }, { status: 404 })
    }

    const purchase = await createPackagePurchase(userId, fitnessPackage)

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        status: purchase.status,
        purchasedAt: purchase.purchasedAt,
        startsAt: purchase.startsAt,
        expiresAt: purchase.expiresAt,
        remainingDays: getRemainingDays(purchase.expiresAt),
        package: {
          id: purchase.package.id,
          slug: purchase.package.slug,
          name: purchase.package.name,
          headline: purchase.package.headline,
          description: purchase.package.description,
          price: purchase.package.price,
          originalPrice: purchase.package.originalPrice,
          currency: purchase.package.currency,
          durationInDays: purchase.package.durationInDays,
          isPopular: purchase.package.isPopular,
          themeColor: purchase.package.themeColor,
          iconName: purchase.package.iconName,
          features: purchase.package.features,
          notIncluded: purchase.package.notIncluded,
        },
      },
    })
  } catch (error) {
    console.error("Package purchase error:", error)
    return NextResponse.json({ error: "Paket satın alma işlemi tamamlanamadı" }, { status: 500 })
  }
}
