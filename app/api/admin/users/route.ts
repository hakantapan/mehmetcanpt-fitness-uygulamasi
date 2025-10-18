import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"

const ROLE_MAP: Record<string, "CLIENT" | "TRAINER"> = {
  danisan: "CLIENT",
  client: "CLIENT",
  CLIENT: "CLIENT",
  egitmen: "TRAINER",
  trainer: "TRAINER",
  TRAINER: "TRAINER",
}

const STATUS_MAP: Record<string, boolean> = {
  active: true,
  inactive: false,
}

const ACTIVE_PACKAGE_STATUSES = ["ACTIVE", "PENDING"]

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  return null
}

function formatProfileName(profile?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!profile) return null
  const parts = [profile.firstName, profile.lastName].filter(Boolean)
  if (!parts.length) return null
  return parts.join(" ")
}

export async function GET(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const url = new URL(request.url)
    const search = url.searchParams.get("search") ?? url.searchParams.get("q") ?? ""
    const roleParam = url.searchParams.get("role") ?? "all"
    const statusParam = url.searchParams.get("status") ?? "all"

    const where: Prisma.UserWhereInput = {
      role: {
        not: "ADMIN",
      },
    }

    const mappedRole = ROLE_MAP[roleParam ?? ""]
    if (mappedRole) {
      where.role = mappedRole
    }

    const mappedStatus = STATUS_MAP[statusParam ?? ""]
    if (typeof mappedStatus === "boolean") {
      where.isActive = mappedStatus
    }

    const searchTerm = search.trim()
    if (searchTerm.length > 0) {
      const or: Prisma.UserWhereInput[] = [
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          profile: {
            firstName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          profile: {
            lastName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      ]
      where.OR = or
    }

    const [users, totalUsers, activeClients, trainerCount, inactiveUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
        include: {
          profile: true,
          trainerRelations: {
            where: {
              trainer: {
                isActive: true,
              },
            },
            take: 1,
            include: {
              trainer: {
                include: {
                  profile: true,
                },
              },
            },
          },
          trainedClients: {
            where: {
              isActive: true,
            },
          },
          packagePurchases: {
            where: {
              status: {
                in: ACTIVE_PACKAGE_STATUSES,
              },
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              expiresAt: "desc",
            },
            take: 1,
            include: {
              package: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          role: { not: "ADMIN" },
        },
      }),
      prisma.user.count({
        where: {
          role: "CLIENT",
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          role: "TRAINER",
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          role: { not: "ADMIN" },
          isActive: false,
        },
      }),
    ])

    const payload = users.map((user) => {
      const fullName = formatProfileName(user.profile) ?? user.email
      const trainerRelation = user.trainerRelations?.[0]
      const trainerName =
        trainerRelation?.trainer?.profile
          ? formatProfileName(trainerRelation.trainer.profile)
          : trainerRelation?.trainer?.email ?? null

      const packagePurchase = user.packagePurchases?.[0]
      const packageName = packagePurchase?.package?.name ?? null

      return {
        id: user.id,
        email: user.email,
        name: fullName,
        phone: user.profile?.phone ?? null,
        role: user.role,
        isActive: user.isActive,
        joinDate: user.createdAt.toISOString(),
        lastLogin: user.updatedAt.toISOString(),
        avatar: user.profile?.avatar ?? null,
        trainer: user.role === "CLIENT" ? trainerName : null,
        package: user.role === "CLIENT" ? packageName : null,
        clients: user.role === "TRAINER" ? user.trainedClients?.length ?? 0 : null,
      }
    })

    return NextResponse.json({
      summary: {
        totalUsers,
        activeClients,
        trainerCount,
        inactiveUsers,
      },
      users: payload,
    })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Kullanıcılar yüklenemedi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : null
    const roleInput = typeof body.role === "string" ? body.role : ""

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Ad, e-posta ve şifre zorunludur" }, { status: 400 })
    }

    const role = ROLE_MAP[roleInput]
    if (!role) {
      return NextResponse.json({ error: "Geçersiz rol seçimi" }, { status: 400 })
    }

    const [firstName, ...rest] = name.split(/\s+/)
    const lastName = rest.join(" ") || null

    const hashedPassword = await bcrypt.hash(password, 12)

    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        isActive: true,
        profile: {
          create: {
            firstName,
            lastName,
            phone,
          },
        },
      },
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (error) {
    console.error("Admin users create error:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı" }, { status: 409 })
    }
    return NextResponse.json({ error: "Kullanıcı oluşturulamadı" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const id = typeof body.id === "string" ? body.id : ""
    const status = typeof body.status === "string" ? body.status : ""

    if (!id || !status) {
      return NextResponse.json({ error: "Kullanıcı bilgileri eksik" }, { status: 400 })
    }

    const mappedStatus = STATUS_MAP[status]
    if (typeof mappedStatus !== "boolean") {
      return NextResponse.json({ error: "Geçersiz durum bilgisi" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: mappedStatus,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin users update error:", error)
    return NextResponse.json({ error: "Kullanıcı güncellenemedi" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    const id = typeof body.id === "string" ? body.id : ""
    if (!id) {
      return NextResponse.json({ error: "Kullanıcı ID gerekli" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin users delete error:", error)
    return NextResponse.json({ error: "Kullanıcı silinemedi" }, { status: 500 })
  }
}
