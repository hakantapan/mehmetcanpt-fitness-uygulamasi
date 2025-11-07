# Mehmetcan PT Fitness Uygulaması

Modern personal training (PT) yönetimi için geliştirilmiş tam kapsamlı bir SaaS uygulaması. Eğitmenler, danışanlar ve yöneticiler için rol tabanlı paneller, abonelik paketleri, ödeme entegrasyonları ve zengin iletişim özellikleri sunar.

## Özellikler

- **Rol Tabanlı Paneller**
  - Admin: paketler, ödemeler, mail ayarları, kullanıcı ve log yönetimi
  - Eğitmen: danışan takibi, program/diye/supplement atama, Soru-Cevap
  - Danışan: kişisel programlar, haftalık hatırlatmalar, destek kaydı
- **Ödeme Altyapısı**
  - PayTR iframe API ile kartlı ödeme
  - Manuel EFT / Havale hesap yönetimi (admin panelinden sınırsız hesap ekle)
  - Paket bazlı abonelikler ve otomatik aktivasyon
- **Mail Entegrasyonu**
  - SMTP/manuel ayarlar (admin panelinden düzenlenebilir)
  - Giriş bildirimi, e-posta doğrulama, program atama, destek yanıtı vb. otomatik e-postalar
  - Haftalık hatırlatma cron job'ları
- **Esnek Paket Yönetimi**
  - Admin panelinden paket oluşturma/güncelleme/silme
  - Paket içeriği, süre, popülerlik, aktiflik gibi alanları dinamik yönetme
- **PayTR & Manuel Havale Logları**
  - Hem PayTR hem manuel işlemler için audit kayıtları `admin_logs` tablosuna düşer
- **Çok aşamalı satın alma deneyimi**
  - Paket seçimi → bilgiler → PayTR iframe adımı
  - PayTR dönüşünde otomatik paket aktivasyonu ve sonuç sayfası

## Teknolojiler

- Framework: [Next.js 14](https://nextjs.org/)
- UI: Tailwind CSS + Shadcn UI
- Veritabanı: PostgreSQL + Prisma ORM
- Kimlik Doğrulama: NextAuth (credentials provider)
- E-posta: Nodemailer
- Ödeme: PayTR iframe API + manuel havale hesapları

## Kurulum

### Gereksinimler

- Node.js 18 veya üzeri
- PostgreSQL

### Adımlar

```bash
git clone <repository-url>
cd mehmetcanpt-fitness-uygulamasi
npm install
```

`.env` dosyasını oluşturun:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/fitness
NEXTAUTH_SECRET=super-secret-value
NEXTAUTH_URL=http://localhost:3000

# SMTP varsayılanları
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
MAIL_FROM_NAME=Mehmetcan PT
MAIL_FROM_EMAIL=mail@example.com

# PayTR varsayılanları (admin panelinden de güncellenebilir)
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_WEBHOOK_URL=https://example.com/api/paytr/webhook
```

### Veritabanını Hazırlayın

```bash
npx prisma migrate dev
npx prisma db seed
```

Seed sonrası oluşturulan demo kullanıcı şifreleri:

| Rol   | E-posta             | Şifre               |
|-------|---------------------|---------------------|
| Admin | admin@fitness.com   | `FitnessAdmin2024!` |
| Eğitmen | egitmen@fitness.com | `EgitmenSifre2024!` |
| Danışan | danisan@fitness.com | `DanisanSifre2024!` |

### Geliştirme Sunucusu

```bash
npm run dev
```

## Önemli Çevre Değişkenleri

- `DATABASE_URL`: PostgreSQL bağlantısı
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth ayarları
- `SMTP_*`, `MAIL_*`: e-posta gönderimi
- `PAYTR_*`: PayTR API bilgileri; admin panelinde de güncellenebilir
- `DISABLE_CRON=true`: gerektiğinde cron görevlerini devre dışı bırakır

## Admin Paneli

| Sayfa                  | Açıklama                                                                           |
|------------------------|-------------------------------------------------------------------------------------|
| `/admin/odeme-ayarlari`| PayTR API, taksit ve manuel havale hesap yönetimi                                  |
| `/admin/paketler`      | Danışanların göreceği paketleri dinamik olarak düzenleme                            |
| `/admin/mail-ayarlari` | SMTP & mail şablon ayarlarını kontrol                                               |
| `/admin/loglar`        | Sistem/ödeme/abonelik loglarını filtreleyerek inceleme                              |

## API Uç Noktaları

- `POST /api/paytr/checkout`: PayTR token alır (giriş yapmış kullanıcı)
- `POST /api/paytr/complete`: PayTR dönüşünde paketi aktive eder
- `GET /api/manual-payments`: Aktif manuel havale hesaplarını döndürür
- Admin API'leri: `/api/admin/paytr-settings`, `/api/admin/manual-payments`, `/api/admin/packages` (role: ADMIN)

## Güvenlik Özellikleri

- SQL Injection koruması (Prisma ORM ile güvenli sorgular)
- Rate limiting (brute force saldırılarına karşı koruma)
- Dosya yükleme güvenliği (magic bytes kontrolü, path traversal önleme)
- Şifre validasyonu (uzunluk ve karmaşıklık kontrolü)
- Güvenli hata mesajları (bilgi sızıntısı önleme)

## Geliştirme Notları

- TypeScript denetimi için `npx tsc --noEmit` kullanabilirsiniz (bazı mevcut legacy hatalar kalmış olabilir).
- Cron job'ları `lib/scheduler.ts` üzerinden devreye girer; serverless ortamlarda dikkat edin.
- Admin panelindeki sticky butonlar mobilde alt kısımda sabit tutulmuştur.
- Manuel havale hesapları `manual_payment_accounts` tablosunda saklanır, API logları `admin_logs`'a yazılır.

## Komutlar

- `npm run dev`: Geliştirme sunucusu
- `npm run build`: Production derlemesi
- `npm run start`: Production sunucusu
- `npm run seed`: Demo verileri oluşturur (`prisma/seed.js`)
- `npm run lint`: Next.js ESLint (ilk çalıştırmada yapılandırma sorabilir)

## Lisans

Bu proje özeldir. Kullanım ve dağıtım hakları Mehmetcan PT ekibine aittir.
