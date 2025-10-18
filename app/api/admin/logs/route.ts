import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import type { LogLevel } from "@prisma/client"

const MAX_PAGE_SIZE = 100

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
    }

    const url = new URL(request.url)
    const levelParam = url.searchParams.get("level")
    const searchParam = url.searchParams.get("q")
    const sourceParam = url.searchParams.get("source")
    const limitParam = url.searchParams.get("limit")
    const cursorParam = url.searchParams.get("cursor")

    const level = levelParam ? (levelParam.toUpperCase() as LogLevel) : undefined
    const take = Math.min(
      Math.max(Number.parseInt(limitParam ?? "50", 10) || 50, 1),
      MAX_PAGE_SIZE
    )

    const where: Record<string, unknown> = {}
    if (level) {
      where.level = level
    }

    const source = sourceParam?.trim()
    if (source && source !== "ALL") {
      where.source = source
    }

    if (searchParam) {
      const search = searchParam.trim()
      if (search.length > 0) {
        where.OR = [
          { message: { contains: search, mode: "insensitive" as const } },
          { actorEmail: { contains: search, mode: "insensitive" as const } },
          { source: { contains: search, mode: "insensitive" as const } },
        ]
      }
    }

    const logs = await prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      cursor: cursorParam ? { id: cursorParam } : undefined,
      skip: cursorParam ? 1 : 0,
    })

    const hasMore = logs.length > take
    const items = hasMore ? logs.slice(0, take) : logs
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Admin logs fetch error:", error)
    return NextResponse.json({ error: "Loglar yüklenemedi" }, { status: 500 })
  }
}
