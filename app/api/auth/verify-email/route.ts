import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
    }

    // Token'ı kontrol et
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerified: false
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 400 })
    }

    // Email'i doğrula
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null
      }
    })

    return NextResponse.json({ 
      message: 'Email başarıyla doğrulandı',
      success: true 
    })

  } catch (error) {
    console.error('Email doğrulama hatası:', error)
    return NextResponse.json({ error: 'Email doğrulanırken bir hata oluştu' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new Response(`
        <html>
          <body>
            <h1>Geçersiz Token</h1>
            <p>Email doğrulama token'ı bulunamadı.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Token'ı kontrol et
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerified: false
      }
    })

    if (!user) {
      return new Response(`
        <html>
          <body>
            <h1>Geçersiz veya Süresi Dolmuş Token</h1>
            <p>Bu email doğrulama bağlantısı geçersiz veya süresi dolmuş.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Email'i doğrula
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null
      }
    })

    return new Response(`
      <html>
        <body>
          <h1>Email Doğrulandı!</h1>
          <p>Email adresiniz başarıyla doğrulandı. Artık uygulamaya giriş yapabilirsiniz.</p>
          <a href="/login">Giriş Yap</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Email doğrulama hatası:', error)
    return new Response(`
      <html>
        <body>
          <h1>Hata</h1>
          <p>Email doğrulanırken bir hata oluştu.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}