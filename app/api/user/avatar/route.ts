import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    // Dosya türü kontrolü
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Sadece resim dosyaları yüklenebilir' }, { status: 400 })
    }

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Dosya boyutu 5MB\'dan küçük olmalıdır' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Dosya adı oluştur
    const fileName = `${session.user.id}_${Date.now()}.${file.name.split('.').pop()}`
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', fileName)

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