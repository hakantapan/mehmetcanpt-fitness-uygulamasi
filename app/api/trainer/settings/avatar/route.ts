import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { validateImageFile } from '@/lib/validation'

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

    // Dosya içeriği doğrulama (MIME type ve magic bytes)
    const fileValidation = await validateImageFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trainers')
    await ensureUploadDir(uploadDir)

    // Güvenli dosya uzantısı belirleme
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const fileExtension = mimeToExt[file.type] || 'bin'

    const fileName = `${randomUUID()}.${fileExtension}`
    const filePath = path.join(uploadDir, fileName)
    
    // Path traversal kontrolü
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: 'Geçersiz dosya yolu' }, { status: 400 })
    }
    
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
