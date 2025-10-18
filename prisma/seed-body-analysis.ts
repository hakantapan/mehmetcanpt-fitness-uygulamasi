import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedBodyAnalysis() {
  try {
    console.log('Vücut analizi örnek verileri ekleniyor...')

    // Örnek kullanıcı ID'si - test için sabit bir ID kullan
    const userId = 'test-user-123' // Test kullanıcısı

    // Eski statik verileri veritabanına ekle
    const measurements = [
      {
        weight: 75.2,
        height: 175,
        chest: 98,
        waist: 82,
        hip: 95,
        arm: 35,
        thigh: 58,
        notes: "İlk ölçüm - Başlangıç noktası",
        recordedAt: new Date('2024-01-15')
      },
      {
        weight: 76.8,
        height: 175,
        chest: 96,
        waist: 85,
        hip: 94,
        arm: 34,
        thigh: 57,
        notes: "İkinci ölçüm - Hafif artış",
        recordedAt: new Date('2024-02-01')
      },
      {
        weight: 75.2,
        height: 175,
        chest: 98,
        waist: 82,
        hip: 95,
        arm: 35,
        thigh: 58,
        notes: "Üçüncü ölçüm - Hedefe ulaşma",
        recordedAt: new Date('2024-02-15')
      }
    ]

    for (const measurement of measurements) {
      // BMI hesapla
      const heightInMeters = measurement.height / 100
      const bmi = measurement.weight / (heightInMeters * heightInMeters)

      await prisma.bodyAnalysis.create({
        data: {
          userId,
          weight: measurement.weight,
          height: measurement.height,
          bmi: parseFloat(bmi.toFixed(2)),
          chest: measurement.chest,
          waist: measurement.waist,
          hip: measurement.hip,
          arm: measurement.arm,
          thigh: measurement.thigh,
          notes: measurement.notes,
          recordedAt: measurement.recordedAt
        }
      })
    }

    console.log('Vücut analizi örnek verileri başarıyla eklendi!')
  } catch (error) {
    console.error('Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedBodyAnalysis()