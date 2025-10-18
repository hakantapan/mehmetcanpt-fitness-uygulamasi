import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Mevcut kullanıcıları sil
  await prisma.packagePurchase.deleteMany({})
  await prisma.fitnessPackage.deleteMany({})
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'admin@fitness.com' },
        { email: 'danisan@fitness.com' },
        { email: 'egitmen@fitness.com' }
      ]
    }
  })

  // Admin kullanıcısı
  const adminPassword = await bcrypt.hash('FitnessAdmin2024!', 12)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fitness.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
      profile: {
        create: {
          firstName: 'Fitness',
          lastName: 'Admin',
          phone: '+90 555 123 4567'
        }
      }
    }
  })

  // Danışan kullanıcısı
  const danisanPassword = await bcrypt.hash('DanisanSifre2024!', 12)
  const danisanUser = await prisma.user.create({
    data: {
      email: 'danisan@fitness.com',
      password: danisanPassword,
      role: 'CLIENT',
      isActive: true,
      profile: {
        create: {
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          phone: '+90 555 987 6543'
        }
      }
    }
  })

  // Eğitmen kullanıcısı
  const egitmenPassword = await bcrypt.hash('EgitmenSifre2024!', 12)
  const egitmenUser = await prisma.user.create({
    data: {
      email: 'egitmen@fitness.com',
      password: egitmenPassword,
      role: 'TRAINER',
      isActive: true,
      profile: {
        create: {
          firstName: 'Mehmet',
          lastName: 'Kaya',
          phone: '+90 555 246 8135'
        }
      }
    }
  })

  const packagesData = [
    {
      slug: 'temel',
      name: 'Temel Paket',
      headline: 'Başlangıç seviyesi için ideal',
      description: 'Temel antrenman ve beslenme rehberliği ile sağlıklı yaşam tarzına adım atın.',
      price: 299,
      originalPrice: 399,
      durationInDays: 30,
      isPopular: false,
      themeColor: 'bg-blue-500',
      iconName: 'zap',
      features: [
        'Kişisel antrenman programı',
        'Beslenme planı',
        'Vücut analizi takibi',
        'Temel supplement önerileri',
        'Email desteği',
        'Mobil uygulama erişimi'
      ],
      notIncluded: [
        '1-1 PT seansları',
        'Canlı video görüşme',
        'Özel beslenme danışmanlığı',
        '24/7 WhatsApp desteği'
      ]
    },
    {
      slug: 'premium',
      name: 'Premium Paket',
      headline: 'Daha hızlı sonuçlar için',
      description: 'Detaylı planlar ve eğitmen desteği ile hedeflerinize daha hızlı ulaşın.',
      price: 599,
      originalPrice: 799,
      durationInDays: 30,
      isPopular: true,
      themeColor: 'bg-orange-500',
      iconName: 'star',
      features: [
        'Kişisel antrenman programı',
        'Detaylı beslenme planı',
        'Vücut analizi takibi',
        'Premium supplement önerileri',
        'Haftalık 1-1 PT seansı',
        'WhatsApp desteği',
        'Özel tarif koleksiyonu',
        'İlerleme raporları'
      ],
      notIncluded: [
        'Günlük canlı destek',
        'Beslenme uzmanı danışmanlığı'
      ]
    },
    {
      slug: 'vip',
      name: 'VIP Paket',
      headline: 'Tam kapsamlı premium destek',
      description: 'Birebir eğitmen ve beslenme uzmanı desteği ile üst düzey deneyim.',
      price: 999,
      originalPrice: 1299,
      durationInDays: 30,
      isPopular: false,
      themeColor: 'bg-purple-500',
      iconName: 'crown',
      features: [
        'Kişisel antrenman programı',
        'Premium beslenme planı',
        'Günlük vücut analizi',
        'Premium supplement paketi',
        'Günlük 1-1 PT desteği',
        '24/7 WhatsApp desteği',
        'Canlı video görüşmeler',
        'Beslenme uzmanı danışmanlığı',
        'Özel tarif geliştirme',
        'Aylık detaylı raporlar',
        'Öncelikli destek'
      ],
      notIncluded: []
    }
  ]

  const seededPackages = []
  for (const pkg of packagesData) {
    const created = await prisma.fitnessPackage.create({ data: pkg })
    seededPackages.push(created)
  }

  const defaultPackage = seededPackages.find((pkg) => pkg.slug === 'premium')
  if (defaultPackage) {
    await prisma.packagePurchase.create({
      data: {
        userId: danisanUser.id,
        packageId: defaultPackage.id,
        status: 'ACTIVE',
        purchasedAt: new Date(),
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + defaultPackage.durationInDays * 24 * 60 * 60 * 1000),
      }
    })
  }

  console.log('Kullanıcılar ve paketler oluşturuldu:', {
    admin: adminUser.email,
    danisan: danisanUser.email,
    egitmen: egitmenUser.email,
    packages: seededPackages.map((pkg) => pkg.name)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
