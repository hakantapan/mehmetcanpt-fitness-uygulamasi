import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/mail'
import { validatePassword, validateEmail } from '@/lib/validation'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

// UserRole type tanımı
type UserRole = 'ADMIN' | 'TRAINER' | 'CLIENT'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting kontrolü - kayıt işlemi için daha sıkı limit
    const identifier = getClientIdentifier(request)
    const rateLimit = checkRateLimit(`register:${identifier}`, {
      maxRequests: 5, // 15 dakikada maksimum 5 kayıt denemesi
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      gender,
      age,
      height,
      weight,
      targetWeight,
      activityLevel,
      fitnessGoal,
      role = 'CLIENT'
    } = body

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, şifre, ad ve soyad gerekli' },
        { status: 400 }
      )
    }

    // Email format kontrolü
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Geçersiz email formatı' },
        { status: 400 }
      )
    }

    // Şifre güvenlik kontrolü
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Email doğrulama token'ı oluştur
    const emailVerificationToken = crypto.randomUUID()

    // Enum değerlerini Prisma formatına dönüştür
    const formatGender = (value: string | null | undefined) => {
      if (!value) return null
      return value === 'Erkek' ? 'Erkek' :
             value === 'Kadın' ? 'Kadin' :
             value === 'Diğer' ? 'Diger' : null
    }

    const formatActivityLevel = (value: string | null | undefined) => {
      if (!value) return null
      return value === 'Düşük' ? 'Dusuk' :
             value === 'Orta' ? 'Orta' :
             value === 'Yüksek' ? 'Yuksek' : null
    }

    const formatFitnessGoal = (value: string | null | undefined) => {
      if (!value) return null
      return value === 'Kilo Verme' ? 'KiloVerme' :
             value === 'Kilo Alma' ? 'KiloAlma' :
             value === 'Kas Kazanma' ? 'KasKazanma' :
             value === 'Genel Sağlık' ? 'GenelSaglik' : null
    }

    // Kullanıcıyı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as UserRole,
        emailVerified: false,
        emailVerificationToken,
        // Sadece profil bilgilerini oluştur
        profile: {
          create: {
            firstName,
            lastName,
            phone: phone || null,
            gender: formatGender(gender),
            age: age ? parseInt(age.toString()) : null,
            height: height ? parseFloat(height.toString()) : null,
            weight: weight ? parseFloat(weight.toString()) : null,
            targetWeight: targetWeight ? parseFloat(targetWeight.toString()) : null,
            activityLevel: formatActivityLevel(activityLevel),
            fitnessGoal: formatFitnessGoal(fitnessGoal)
          }
        }
      },
      include: {
        profile: true
      }
    })

    // Kayıt sonrası otomatik vücut analizi oluştur (başlangıç ölçümü)
    if (height && weight) {
      const heightInMeters = parseFloat(height.toString()) / 100
      const weightValue = parseFloat(weight.toString())
      const bmi = weightValue / (heightInMeters * heightInMeters)

      await prisma.bodyAnalysis.create({
        data: {
          userId: user.id,
          weight: weightValue,
          height: parseFloat(height.toString()),
          bmi: parseFloat(bmi.toFixed(2)),
          notes: "Kayıt sırasındaki başlangıç ölçümü"
        }
      })
    }

    // Email doğrulama URL'si
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${emailVerificationToken}`
    
    const fullName = `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || null

    await sendVerificationEmail(
      user.email,
      {
        name: fullName,
        verificationUrl,
      },
      {
        actorId: user.id,
        actorEmail: user.email,
        context: {
          userId: user.id,
          role: user.role,
        },
      },
    )

    // Şifreyi response'dan çıkar
    const { password: _, emailVerificationToken: __, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Kullanıcı başarıyla oluşturuldu. Lütfen e-posta gelen kutunuzu kontrol edin.',
      user: userWithoutPassword,
      needsEmailVerification: true,
      verificationUrl: verificationUrl // Development için
    }, { status: 201 })

  } catch (error) {
    console.error('Register error:', error)
    // Güvenlik: Detaylı hata bilgisi kullanıcıya gösterilmez
    return NextResponse.json(
      { error: 'Kayıt işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    )
  }
}
