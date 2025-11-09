import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validatePassword, validateEmail } from "@/lib/validation"
import { Prisma } from "@prisma/client"

async function ensureAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    console.log("[Admin Profile API] GET request received")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("[Admin Profile API] No session or user ID")
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    console.log("[Admin Profile API] Fetching profile for user ID:", session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    })

    if (!user) {
      console.log("[Admin Profile API] User not found")
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
    }

    const responseData = {
      id: user.id,
      email: user.email,
      name: user.profile
        ? `${user.profile.firstName || ""} ${user.profile.lastName || ""}`.trim()
        : "",
      firstName: user.profile?.firstName || "",
      lastName: user.profile?.lastName || "",
      phone: user.profile?.phone || "",
    }

    console.log("[Admin Profile API] Returning profile data:", responseData)
    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("[Admin Profile API] Profile fetch error:", error)
    return NextResponse.json({ error: "Profil bilgileri yüklenemedi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResponse = await ensureAdmin(request)
  if (authResponse) return authResponse

  try {
    console.log("[Admin Profile API] PUT request received")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("[Admin Profile API] No session or user ID")
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    console.log("[Admin Profile API] User ID:", session.user.id)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      console.log("[Admin Profile API] Invalid request body")
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
    }

    console.log("[Admin Profile API] Request body:", { ...body, password: body.password ? "***" : "" })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
    }

    const updateData: Prisma.UserUpdateInput = {}
    const profileUpdates: Prisma.UserProfileUpdateInput = {}

    // Email güncelleme
    if (typeof body.email === "string" && body.email.trim()) {
      const newEmail = body.email.trim().toLowerCase()
      if (!validateEmail(newEmail)) {
        return NextResponse.json({ error: "Geçersiz email formatı" }, { status: 400 })
      }

      // Email değişikliği kontrolü
      if (newEmail !== user.email) {
        // Yeni email'in başka bir kullanıcıda kullanılıp kullanılmadığını kontrol et
        const existingUser = await prisma.user.findUnique({
          where: { email: newEmail },
        })

        if (existingUser && existingUser.id !== user.id) {
          return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 409 })
        }

        updateData.email = newEmail
      }
    }

    // Ad Soyad güncelleme
    if (typeof body.name === "string" && body.name.trim()) {
      const [firstName, ...rest] = body.name.trim().split(/\s+/)
      profileUpdates.firstName = firstName
      const lastName = rest.join(" ").trim()
      profileUpdates.lastName = lastName || null
    } else if (typeof body.firstName === "string" || typeof body.lastName === "string") {
      if (typeof body.firstName === "string") {
        profileUpdates.firstName = body.firstName.trim()
      }
      if (typeof body.lastName === "string") {
        profileUpdates.lastName = body.lastName.trim() || null
      }
    }

    // Telefon güncelleme
    if (typeof body.phone === "string") {
      profileUpdates.phone = body.phone.trim() || null
    }

    // Şifre güncelleme
    if (typeof body.password === "string" && body.password.trim().length > 0) {
      const passwordValidation = validatePassword(body.password)
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
      }
      const hashed = await bcrypt.hash(body.password, 12)
      updateData.password = hashed
    }

    // Profil güncellemeleri varsa ekle
    if (Object.keys(profileUpdates).length > 0) {
      if (user.profile) {
        updateData.profile = {
          update: profileUpdates,
        }
      } else {
        updateData.profile = {
          create: {
            firstName: profileUpdates.firstName || user.email.split("@")[0],
            lastName: profileUpdates.lastName || null,
            phone: profileUpdates.phone || null,
          },
        }
      }
    }

    // Güncelleme yapılacak veri varsa
    if (Object.keys(updateData).length > 0) {
      console.log("[Admin Profile API] Updating user with data:", { ...updateData, password: updateData.password ? "***" : "" })
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      })
      console.log("[Admin Profile API] User updated successfully")
    } else {
      console.log("[Admin Profile API] No data to update")
    }

    // Güncellenmiş kullanıcı bilgilerini döndür
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    })

    const responseData = {
      id: updatedUser?.id,
      email: updatedUser?.email,
      name: updatedUser?.profile
        ? `${updatedUser.profile.firstName || ""} ${updatedUser.profile.lastName || ""}`.trim()
        : "",
      firstName: updatedUser?.profile?.firstName || "",
      lastName: updatedUser?.profile?.lastName || "",
      phone: updatedUser?.profile?.phone || "",
    }

    console.log("[Admin Profile API] Returning response:", responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Admin profile update error:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 409 })
    }
    return NextResponse.json({ error: "Profil güncellenemedi" }, { status: 500 })
  }
}

