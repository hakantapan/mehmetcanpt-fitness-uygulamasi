import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'
import { validateImageFile, sanitizeFileName } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Geçersiz dosya' }, { status: 400 })
    }

    // Dosya içeriği doğrulama (MIME type ve magic bytes)
    const fileValidation = await validateImageFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Güvenli dosya adı oluştur (path traversal ve özel karakterleri önle)
    const fileName = sanitizeFileName(file.name, session.user.id)
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', fileName)
    
    // Path traversal kontrolü - dosya yolu public/uploads/avatars içinde olmalı
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(uploadsDir)
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: 'Geçersiz dosya yolu' }, { status: 400 })
    }

    // Uploads klasörünü oluştur
    const { mkdir } = await import('fs/promises')
    await mkdir(path.join(process.cwd(), 'public', 'uploads', 'avatars'), { recursive: true })

    // Dosyayı kaydet
    await writeFile(filePath, buffer)

    // Veritabanını güncelle
    const avatarUrl = `/uploads/avatars/${fileName}`
    
    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: { avatar: avatarUrl }
    })

    return NextResponse.json({ 
      message: 'Avatar başarıyla güncellendi',
      avatarUrl 
    })

  } catch (error) {
    console.error('Avatar yükleme hatası:', error)
    return NextResponse.json({ error: 'Avatar yüklenirken bir hata oluştu' }, { status: 500 })
  }
}