import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const packages = await prisma.fitnessPackage.findMany({
      where: { isActive: true },
      orderBy: [
        { price: "asc" },
        { createdAt: "asc" },
      ],
    })

    return NextResponse.json({
      packages: packages.map((pkg) => ({
        id: pkg.id,
        slug: pkg.slug,
        name: pkg.name,
        headline: pkg.headline,
        description: pkg.description,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        currency: pkg.currency,
        durationInDays: pkg.durationInDays,
        isPopular: pkg.isPopular,
        themeColor: pkg.themeColor,
        iconName: pkg.iconName,
        features: pkg.features,
        notIncluded: pkg.notIncluded,
      })),
    })
  } catch (error) {
    console.error("Packages fetch error:", error)
    return NextResponse.json({ error: "Paketler getirilemedi" }, { status: 500 })
  }
}
