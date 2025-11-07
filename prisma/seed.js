const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  await prisma.adminLog.deleteMany({})
  await prisma.trainerOrder.deleteMany({})
  await prisma.packagePurchase.deleteMany({})
  await prisma.fitnessPackage.deleteMany({})
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "admin@fitness.com" },
        { email: "danisan@fitness.com" },
        { email: "egitmen@fitness.com" },
      ],
    },
  })
  await prisma.mailSetting.deleteMany({})
  await prisma.paytrLog.deleteMany({})
  await prisma.paytrSetting.deleteMany({})

  const adminPassword = await bcrypt.hash("FitnessAdmin2024!", 12)
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@fitness.com",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
      profile: {
        create: {
          firstName: "Fitness",
          lastName: "Admin",
          phone: "+90 555 123 4567",
        },
      },
    },
  })

  const danisanPassword = await bcrypt.hash("DanisanSifre2024!", 12)
  const danisanUser = await prisma.user.create({
    data: {
      email: "danisan@fitness.com",
      password: danisanPassword,
      role: "CLIENT",
      isActive: true,
      profile: {
        create: {
          firstName: "Ayşe",
          lastName: "Yılmaz",
          phone: "+90 555 987 6543",
        },
      },
    },
  })

  const egitmenPassword = await bcrypt.hash("EgitmenSifre2024!", 12)
  const egitmenUser = await prisma.user.create({
    data: {
      email: "egitmen@fitness.com",
      password: egitmenPassword,
      role: "TRAINER",
      isActive: true,
      profile: {
        create: {
          firstName: "Mehmet",
          lastName: "Kaya",
          phone: "+90 555 246 8135",
        },
      },
    },
  })

  const packagesData = [
    {
      slug: "temel",
      name: "Temel Paket",
      headline: "Başlangıç seviyesi için ideal",
      description:
        "Temel antrenman ve beslenme rehberliği ile sağlıklı yaşam tarzına adım atın.",
      price: 299,
      originalPrice: 399,
      durationInDays: 30,
      isPopular: false,
      themeColor: "bg-blue-500",
      iconName: "zap",
      features: [
        "Kişisel antrenman programı",
        "Beslenme planı",
        "Vücut analizi takibi",
        "Temel supplement önerileri",
        "Email desteği",
        "Mobil uygulama erişimi",
      ],
      notIncluded: [
        "1-1 PT seansları",
        "Canlı video görüşme",
        "Özel beslenme danışmanlığı",
        "24/7 WhatsApp desteği",
      ],
    },
    {
      slug: "premium",
      name: "Premium Paket",
      headline: "Daha hızlı sonuçlar için",
      description:
        "Detaylı planlar ve eğitmen desteği ile hedeflerinize daha hızlı ulaşın.",
      price: 599,
      originalPrice: 799,
      durationInDays: 30,
      isPopular: true,
      themeColor: "bg-orange-500",
      iconName: "star",
      features: [
        "Kişisel antrenman programı",
        "Detaylı beslenme planı",
        "Vücut analizi takibi",
        "Premium supplement önerileri",
        "Haftalık 1-1 PT seansı",
        "WhatsApp desteği",
        "Özel tarif koleksiyonu",
        "İlerleme raporları",
      ],
      notIncluded: ["Günlük canlı destek", "Beslenme uzmanı danışmanlığı"],
    },
    {
      slug: "vip",
      name: "VIP Paket",
      headline: "Tam kapsamlı premium destek",
      description:
        "Birebir eğitmen ve beslenme uzmanı desteği ile üst düzey deneyim.",
      price: 999,
      originalPrice: 1299,
      durationInDays: 30,
      isPopular: false,
      themeColor: "bg-purple-500",
      iconName: "crown",
      features: [
        "Kişisel antrenman programı",
        "Premium beslenme planı",
        "Günlük vücut analizi",
        "Premium supplement paketi",
        "Günlük 1-1 PT desteği",
        "24/7 WhatsApp desteği",
        "Canlı video görüşmeler",
        "Beslenme uzmanı danışmanlığı",
        "Özel tarif geliştirme",
        "Aylık detaylı raporlar",
        "Öncelikli destek",
      ],
      notIncluded: [],
    },
  ]

  const seededPackages = []
  for (const pkg of packagesData) {
    const created = await prisma.fitnessPackage.create({ data: pkg })
    seededPackages.push(created)
  }

  const defaultPackage = seededPackages.find((pkg) => pkg.slug === "premium")
  if (defaultPackage) {
    await prisma.packagePurchase.create({
      data: {
        userId: danisanUser.id,
        packageId: defaultPackage.id,
        status: "ACTIVE",
        purchasedAt: new Date(),
        startsAt: new Date(),
        expiresAt: new Date(
          Date.now() + defaultPackage.durationInDays * 24 * 60 * 60 * 1000
        ),
      },
    })
  }

  const orderBaseDate = new Date()
  const orderSamples = [
    { monthsAgo: 0, amount: 799, status: "Aktif", paymentStatus: "Odendi" },
    { monthsAgo: 1, amount: 599, status: "Tamamlandi", paymentStatus: "Odendi" },
    { monthsAgo: 2, amount: 999, status: "Aktif", paymentStatus: "Odendi" },
    { monthsAgo: 3, amount: 299, status: "Beklemede", paymentStatus: "Bekliyor" },
    { monthsAgo: 4, amount: 599, status: "Tamamlandi", paymentStatus: "Odendi" },
    { monthsAgo: 5, amount: 799, status: "Aktif", paymentStatus: "Odendi" },
  ]

  for (const sample of orderSamples) {
    const orderDate = new Date(
      orderBaseDate.getFullYear(),
      orderBaseDate.getMonth() - sample.monthsAgo,
      10
    )
    await prisma.trainerOrder.create({
      data: {
        trainerId: egitmenUser.id,
        clientName: "Ayşe Yılmaz",
        clientEmail: danisanUser.email,
        clientAvatar: null,
        packageName: "Premium Paket",
        packageType: "Online",
        amount: sample.amount,
        status: sample.status,
        paymentStatus: sample.paymentStatus,
        orderDate,
        startDate: orderDate,
        endDate: new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        services: {
          workouts: 4,
          nutrition: true,
          checkins: "haftada 1",
        },
        notes: sample.paymentStatus === "Bekliyor" ? "Ödeme onayı bekleniyor." : null,
      },
    })
  }

  await prisma.adminLog.createMany({
    data: [
      {
        level: "AUDIT",
        message: "Admin paneline giriş yapıldı",
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        source: "web",
      },
      {
        level: "INFO",
        message: "Yeni premium paket satışı gerçekleşti",
        actorId: danisanUser.id,
        actorEmail: danisanUser.email,
        source: "api",
        context: {
          package: defaultPackage?.name ?? "Premium Paket",
          amount: defaultPackage?.price ?? 599,
        },
      },
      {
        level: "WARN",
        message: "Veritabanı bağlantı süresi normale göre yüksek",
        source: "db",
        context: {
          latencyMs: 450,
          host: "primary-db",
        },
      },
      {
        level: "ERROR",
        message: "Güvenlik taraması başarısız",
        source: "security",
        context: {
          jobId: "scan-2024-02-18",
          reason: "İzin reddedildi",
        },
      },
      {
        level: "INFO",
        message: "API servisleri yeniden başlatıldı",
        source: "api",
        context: {
          deploymentId: "deploy-2024-02-18",
          routesImpacted: 3,
        },
      },
    ],
  })

  await prisma.mailSetting.create({
    data: {
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === "true",
      username: process.env.SMTP_USER || null,
      password: process.env.SMTP_PASS || null,
      fromName: process.env.MAIL_FROM_NAME || "Mehmetcanpt Uzaktan Eğitim",
      fromEmail: process.env.MAIL_FROM_EMAIL || "noreply@example.com",
      replyTo: process.env.MAIL_REPLY_TO || null,
      isActive: true,
      lastTested: null,
    },
  })

  const paytrSetting = await prisma.paytrSetting.create({
    data: {
      mode: (process.env.PAYTR_MODE === "LIVE" ? "LIVE" : "TEST"),
      merchantId: process.env.PAYTR_MERCHANT_ID || "demo-merchant",
      merchantKey: process.env.PAYTR_MERCHANT_KEY || "demo-key",
      merchantSalt: process.env.PAYTR_MERCHANT_SALT || "demo-salt",
      iframeKey: process.env.PAYTR_IFRAME_KEY || null,
      merchantOkUrl: process.env.PAYTR_OK_URL || "https://example.com/payment/success",
      merchantFailUrl: process.env.PAYTR_FAIL_URL || "https://example.com/payment/fail",
      merchantWebhookUrl: process.env.PAYTR_WEBHOOK_URL || "https://example.com/api/paytr/webhook",
      currency: "TL",
      language: "tr",
      iframeDebug: false,
      non3d: false,
      maxInstallment: 0,
    },
  })

  await prisma.paytrLog.createMany({
    data: [
      {
        settingId: paytrSetting.id,
        action: "settings_seed",
        status: "info",
        message: "Varsayılan PayTR ayarları yüklendi",
        payload: {
          mode: paytrSetting.mode,
        },
      },
      {
        settingId: paytrSetting.id,
        action: "connection_test",
        status: "success",
        message: "Seed bağlantı testi simüle edildi",
        payload: {
          latencyMs: 120,
        },
      },
    ],
  })

  console.log("Kullanıcılar ve paketler oluşturuldu:", {
    admin: adminUser.email,
    danisan: danisanUser.email,
    egitmen: egitmenUser.email,
    packages: seededPackages.map((pkg) => pkg.name),
  })
}

main()
  .catch((error) => {
    console.error("Seed görevinde hata:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
