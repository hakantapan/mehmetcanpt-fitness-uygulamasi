import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getActivePackagePurchase } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const body = await request.json()
    
    const parseIntField = (
      value: unknown,
      field: string,
      { required = false }: { required?: boolean } = {}
    ) => {
      if (value === undefined || value === null || value === '') {
        return required ? { error: `${field} alanı zorunludur` } : { value: undefined }
      }
      const parsed = Number.parseInt(String(value), 10)
      if (Number.isNaN(parsed)) {
        return { error: `${field} geçerli bir sayı olmalıdır` }
      }
      return { value: parsed }
    }

    const workoutDaysResult = parseIntField(body.workoutDaysPerWeek, 'workoutDaysPerWeek', { required: true })
    if ('error' in workoutDaysResult) {
      return NextResponse.json({ error: workoutDaysResult.error }, { status: 400 })
    }
    const workoutDays = workoutDaysResult.value as number

    const mealFrequencyResult = parseIntField(body.mealFrequency, 'mealFrequency')
    if ('error' in mealFrequencyResult) {
      return NextResponse.json({ error: mealFrequencyResult.error }, { status: 400 })
    }

    // PT Form oluştur (sadece PT'ye özel bilgiler)
    const ptForm = await prisma.pTForm.create({
      data: {
        userId: session.user.id,
        bodyPhotos: body.bodyPhotos || undefined,
        healthConditions: body.healthConditions || undefined,
        injuries: body.injuries || undefined,
        medications: body.medications || undefined,
        workoutLocation: body.workoutLocation, // enum: 'home' | 'gym'
        equipmentAvailable: body.equipmentAvailable || undefined, // enum: 'withEquipment' | 'withoutEquipment'
        equipmentPhotos: body.equipmentPhotos || undefined,
        workoutDaysPerWeek: workoutDays,
        experience: body.experience || 'beginner', // enum: 'beginner' | 'intermediate' | 'advanced' | 'expert'
        mealFrequency: mealFrequencyResult.value,
        dietRestrictions: body.dietRestrictions || undefined,
        jobDetails: body.jobDetails || undefined,
        trainingExpectations: body.trainingExpectations || undefined,
        sportHistory: body.sportHistory || undefined,
        lastTrainingProgram: body.lastTrainingProgram || undefined,
        emergencyContactName: body.emergencyContactName || undefined,
        emergencyContactPhone: body.emergencyContactPhone || undefined,
        specialRequests: body.specialRequests || undefined,
        agreedToTerms: typeof body.agreedToTerms === 'boolean' ? body.agreedToTerms : false
      }
    })

    return NextResponse.json({
      message: 'PT formu başarıyla oluşturuldu',
      ptForm
    }, { status: 201 })

  } catch (error) {
    console.error('PT Form oluşturma hatası:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    // Kullanıcının en son PT formunu getir
    const ptForm = await prisma.pTForm.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!ptForm) {
      return NextResponse.json({ error: 'PT formu bulunamadı' }, { status: 404 })
    }

    // PostgreSQL JSON tipi ile artık parse etmeye gerek yok
    return NextResponse.json(ptForm)
  } catch (error) {
    console.error('PT Form getirme hatası:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const activePackage = await getActivePackagePurchase(session.user.id)
    if (!activePackage) {
      return NextResponse.json({ error: 'Aktif paket bulunamadı' }, { status: 403 })
    }

    const body = await request.json()

    // Hedef formu belirle (gönderilen id varsa onu, yoksa son oluşturulanı)
    const targetForm = body.id
      ? await prisma.pTForm.findFirst({
          where: { id: body.id as string, userId: session.user.id }
        })
      : await prisma.pTForm.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' }
        })

    if (!targetForm) {
      return NextResponse.json({ error: 'Güncellenecek PT formu bulunamadı' }, { status: 404 })
    }

    const parseOptionalInt = (value: unknown, field: string) => {
      if (value === undefined || value === null || value === '') {
        return { value: undefined }
      }
      const parsed = Number.parseInt(String(value), 10)
      if (Number.isNaN(parsed)) {
        return { error: `${field} geçerli bir sayı olmalıdır` }
      }
      return { value: parsed }
    }

    const workoutDaysUpdate = parseOptionalInt(body.workoutDaysPerWeek, 'workoutDaysPerWeek')
    if ('error' in workoutDaysUpdate) {
      return NextResponse.json({ error: workoutDaysUpdate.error }, { status: 400 })
    }

    const mealFrequencyUpdate = parseOptionalInt(body.mealFrequency, 'mealFrequency')
    if ('error' in mealFrequencyUpdate) {
      return NextResponse.json({ error: mealFrequencyUpdate.error }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      bodyPhotos: body.bodyPhotos || undefined,
      healthConditions: body.healthConditions || undefined,
      injuries: body.injuries || undefined,
      medications: body.medications || undefined,
      equipmentAvailable: body.equipmentAvailable || undefined,
      equipmentPhotos: body.equipmentPhotos || undefined,
      experience: body.experience || undefined,
      mealFrequency: mealFrequencyUpdate.value,
      dietRestrictions: body.dietRestrictions || undefined,
      jobDetails: body.jobDetails || undefined,
      trainingExpectations: body.trainingExpectations || undefined,
      sportHistory: body.sportHistory || undefined,
      lastTrainingProgram: body.lastTrainingProgram || undefined,
      specialRequests: body.specialRequests || undefined,
      agreedToTerms: typeof body.agreedToTerms === 'boolean' ? body.agreedToTerms : undefined,
    }

    if (typeof body.workoutLocation === 'string' && body.workoutLocation.trim()) {
      updateData.workoutLocation = body.workoutLocation
    }

    if (workoutDaysUpdate.value !== undefined) {
      updateData.workoutDaysPerWeek = workoutDaysUpdate.value
    }

    const updated = await prisma.pTForm.update({
      where: { id: targetForm.id },
      data: updateData
    })

    return NextResponse.json({
      message: 'PT formu başarıyla güncellendi',
      ptForm: updated
    })
  } catch (error) {
    console.error('PT Form güncelleme hatası:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
