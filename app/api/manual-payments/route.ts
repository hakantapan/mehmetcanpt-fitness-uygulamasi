import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const accounts = await prisma.manualPaymentAccount.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        bankName: true,
        accountName: true,
        iban: true,
        accountNumber: true,
        branchName: true,
        description: true,
      },
    })

    return NextResponse.json({
      accounts,
    })
  } catch (error) {
    console.error("Public manual payments fetch error:", error)
    return NextResponse.json({ error: "Havale bilgileri getirilemedi" }, { status: 500 })
  }
}
