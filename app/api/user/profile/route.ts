import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // UserProfile'dan temel bilgileri çek
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    })

    // PT formundan spesifik bilgileri çek
    const ptForm = await prisma.pTForm.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 })
    }

    // UserProfile'dan temel bilgiler, PT formundan spesifik bilgiler
    return NextResponse.json({
      name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
      age: userProfile.age?.toString() || '',
      gender: userProfile.gender || '',
      height: userProfile.height?.toString() || '',
      weight: userProfile.weight?.toString() || '',
      phone: userProfile.phone || '',
      email: userProfile.user.email || '',
      avatar: userProfile.avatar || '/fitness-user-avatar.png',
      goal: userProfile.fitnessGoal || 'Kilo Verme',
      activityLevel: userProfile.activityLevel || 'Orta',
      targetWeight: userProfile.targetWeight?.toString() || '75',
      // PT formundan gelen spesifik bilgiler (varsa)
      ptFormData: ptForm ? {
        workoutLocation: ptForm.workoutLocation,
        workoutDaysPerWeek: ptForm.workoutDaysPerWeek,
        experience: ptForm.experience,
        healthConditions: ptForm.healthConditions,
        trainingExpectations: ptForm.trainingExpectations
      } : null
    })
  } catch (error) {
    console.error('Profil getirme hatası:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await request.json()

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (typeof body.name === 'string' && body.name.trim()) {
      const parts = body.name.trim().split(/\s+/)
      updateData.firstName = parts[0]
      updateData.lastName = parts.slice(1).join(' ') || profile.lastName
    }

    const toNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined
      }
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 'invalid'
    }

    const age = toNumber(body.age)
    if (age === 'invalid') {
      return NextResponse.json({ error: 'Geçersiz yaş değeri' }, { status: 400 })
    }
    if (age !== undefined) {
      updateData.age = age
    }

    const height = toNumber(body.height)
    if (height === 'invalid') {
      return NextResponse.json({ error: 'Geçersiz boy değeri' }, { status: 400 })
    }
    if (height !== undefined) {
      updateData.height = height
    }

    const weight = toNumber(body.weight)
    if (weight === 'invalid') {
      return NextResponse.json({ error: 'Geçersiz kilo değeri' }, { status: 400 })
    }
    if (weight !== undefined) {
      updateData.weight = weight
    }

    const targetWeight = toNumber(body.targetWeight)
    if (targetWeight === 'invalid') {
      return NextResponse.json({ error: 'Geçersiz hedef kilo değeri' }, { status: 400 })
    }
    if (targetWeight !== undefined) {
      updateData.targetWeight = targetWeight
    }

    if (typeof body.gender === 'string' && body.gender.trim()) {
      updateData.gender = body.gender
    }

    if (typeof body.phone === 'string') {
      updateData.phone = body.phone.trim()
    }

    if (typeof body.activityLevel === 'string' && body.activityLevel.trim()) {
      updateData.activityLevel = body.activityLevel
    }

    if (typeof body.goal === 'string' && body.goal.trim()) {
      updateData.fitnessGoal = body.goal
    }

    const previousWeight = profile.weight ?? null
    const hasWeightUpdate = typeof updateData.weight === 'number'

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(profile, { status: 200 })
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: updateData
    })

    if (hasWeightUpdate) {
      try {
        const weightValue = updateData.weight as number
        if (weightValue !== null && weightValue !== undefined && weightValue !== previousWeight) {
          await prisma.measurement.create({
            data: {
              userId: session.user.id,
              type: 'weight',
              value: weightValue,
              unit: 'kg',
              recordedAt: new Date(),
            },
          })
        }
      } catch (measurementError) {
        console.error('Profil güncelleme sırasında ölçüm kaydı oluşturulamadı:', measurementError)
      }
    }

    return NextResponse.json(updatedProfile, { status: 200 })
  } catch (error) {
    console.error('Profil güncelleme hatası:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
