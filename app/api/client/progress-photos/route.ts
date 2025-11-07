import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomUUID } from "crypto"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { getActivePackagePurchase } from "@/lib/subscription"
import { validateImageFile } from "@/lib/validation"

type StoredPhoto = {
  id: string
  data: string
  uploadedAt: string
}

const MAX_PHOTOS = 2
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const parseStoredPhotos = (payload: unknown): StoredPhoto[] => {
  if (!payload) return []
  if (!Array.isArray(payload)) {
    return []
  }

  const toStoredPhoto = (entry: any, fallbackIndex: number): StoredPhoto | null => {
    if (!entry) return null

    const data =
      typeof entry === "string"
        ? entry
        : typeof entry?.data === "string"
          ? entry.data
          : null
    if (!data) return null

    const id =
      typeof entry?.id === "string" && entry.id
        ? entry.id
        : `photo-${fallbackIndex}`

    const uploadedAtValue =
      typeof entry?.uploadedAt === "string" && entry.uploadedAt
        ? entry.uploadedAt
        : new Date().toISOString()

    return {
      id,
      data,
      uploadedAt: uploadedAtValue,
    }
  }

  const normalized = payload
    .map((item, index) => toStoredPhoto(item, index))
    .filter((item): item is StoredPhoto => Boolean(item))

  return normalized
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, MAX_PHOTOS)
}

const sanitizePhotos = (photos: StoredPhoto[]) => {
  return photos.map((photo) => ({
    id: photo.id,
    data: photo.data,
    uploadedAt: photo.uploadedAt,
  }))
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: "Aktif paket bulunamadı" }, { status: 403 })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        bodyPhotos: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 })
    }

    const photos = parseStoredPhotos(profile.bodyPhotos)
    return NextResponse.json({ photos: sanitizePhotos(photos) })
  } catch (error) {
    console.error("Progress photos fetch error:", error)
    return NextResponse.json({ error: "Fotoğraflar alınamadı" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: "Aktif paket bulunamadı" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("photo")

    if (!(file instanceof Blob) || !(file instanceof File)) {
      return NextResponse.json({ error: "Geçersiz dosya" }, { status: 400 })
    }

    // Dosya içeriği doğrulama (MIME type ve magic bytes)
    const fileValidation = await validateImageFile(file as File)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { bodyPhotos: true },
    })

    if (!profile) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || "image/jpeg"
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${mimeType};base64,${base64}`

    const existingPhotos = parseStoredPhotos(profile.bodyPhotos)
    const uploadedAt = new Date().toISOString()

    const newPhoto: StoredPhoto = {
      id: randomUUID(),
      data: dataUrl,
      uploadedAt,
    }

    const updatedPhotos = [newPhoto, ...existingPhotos]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, MAX_PHOTOS)

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        bodyPhotos: updatedPhotos,
      },
    })

    return NextResponse.json({ photos: sanitizePhotos(updatedPhotos) }, { status: 201 })
  } catch (error) {
    console.error("Progress photos upload error:", error)
    return NextResponse.json({ error: "Fotoğraf yüklenirken bir hata oluştu" }, { status: 500 })
  }
}
