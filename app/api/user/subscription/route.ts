import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getActivePackagePurchase, getRemainingDays } from "@/lib/subscription"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const activePurchase = await getActivePackagePurchase(userId)

    if (!activePurchase) {
      return NextResponse.json({ activePackage: null }, { status: 200 })
    }

    return NextResponse.json({
      activePackage: {
        id: activePurchase.id,
        status: activePurchase.status,
        purchasedAt: activePurchase.purchasedAt,
        startsAt: activePurchase.startsAt,
        expiresAt: activePurchase.expiresAt,
        remainingDays: getRemainingDays(activePurchase.expiresAt),
        package: {
          id: activePurchase.package.id,
          slug: activePurchase.package.slug,
          name: activePurchase.package.name,
          headline: activePurchase.package.headline,
          description: activePurchase.package.description,
          price: activePurchase.package.price,
          originalPrice: activePurchase.package.originalPrice,
          currency: activePurchase.package.currency,
          durationInDays: activePurchase.package.durationInDays,
          isPopular: activePurchase.package.isPopular,
          themeColor: activePurchase.package.themeColor,
          iconName: activePurchase.package.iconName,
          features: activePurchase.package.features,
          notIncluded: activePurchase.package.notIncluded,
        },
      },
    })
  } catch (error) {
    console.error("Active package fetch error:", error)
    return NextResponse.json({ error: "Paket bilgisi alınamadı" }, { status: 500 })
  }
}
