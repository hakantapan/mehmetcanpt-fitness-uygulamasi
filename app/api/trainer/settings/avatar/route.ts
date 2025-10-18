import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const ensureUploadDir = async (dirPath: string) => {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Geçerli bir dosya yükleyin' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Desteklenmeyen dosya türü' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Dosya boyutu 5MB sınırını aşıyor' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trainers')
    await ensureUploadDir(uploadDir)

    const fileExtension = file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'bin'

    const fileName = `${randomUUID()}.${fileExtension}`
    const filePath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/trainers/${fileName}`

    await fs.writeFile(filePath, buffer)

    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: { avatar: publicPath },
      create: {
        userId: session.user.id,
        firstName: '',
        lastName: '',
        avatar: publicPath,
      },
    })

    return NextResponse.json({ avatar: publicPath })
  } catch (error) {
    console.error('Trainer avatar upload error:', error)
    return NextResponse.json({ error: 'Profil fotoğrafı yüklenemedi' }, { status: 500 })
  }
}
