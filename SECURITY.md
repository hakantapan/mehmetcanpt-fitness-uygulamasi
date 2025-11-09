# Güvenlik Dokümantasyonu

Bu dokümantasyon, projenin güvenlik özelliklerini ve best practice'leri açıklar.

## Güvenlik Özellikleri

### 1. Authentication & Authorization

- **NextAuth.js** ile JWT tabanlı kimlik doğrulama
- Role-based access control (ADMIN, TRAINER, CLIENT)
- Middleware ile route koruması
- Session timeout kontrolü (NextAuth varsayılanları)

### 2. Şifre Güvenliği

- **bcrypt** ile şifre hashleme (12 rounds)
- Minimum 8 karakter şifre zorunluluğu
- Büyük harf, küçük harf ve rakam zorunluluğu
- Maksimum 128 karakter limiti

### 3. Rate Limiting

- **Login endpoint**: 15 dakikada maksimum 5 başarısız deneme
- **Register endpoint**: Rate limiting aktif
- Memory-based rate limiting (development)
- **Production için**: Redis/Upstash kullanılmalı

#### Production Rate Limiting Kurulumu

Production ortamında Redis tabanlı rate limiting kullanmak için:

1. **Redis kurulumu**:
```bash
# Upstash kullanımı (önerilen)
npm install @upstash/redis @upstash/ratelimit
```

2. **lib/rate-limit-redis.ts** oluşturun:
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
})
```

3. **lib/rate-limit.ts** dosyasını Redis versiyonuyla değiştirin

### 4. XSS Koruması

- **DOMPurify** ile HTML sanitization
- Admin loglar sayfasında mail içeriği sanitize ediliyor
- Sadece güvenli HTML tag'leri ve attribute'larına izin veriliyor

### 5. SQL Injection Koruması

- **Prisma ORM** kullanımı (parametrized queries)
- Raw SQL sorguları kullanılmıyor

### 6. Dosya Yükleme Güvenliği

- Magic bytes kontrolü (dosya içeriği doğrulama)
- MIME type kontrolü
- Path traversal koruması
- Dosya boyutu limiti (5MB)
- Güvenli dosya adı oluşturma

### 7. Input Validation

- Email format kontrolü
- Şifre güvenlik kontrolü
- Dosya validasyonu
- Type checking

### 8. Error Handling

- Production-safe logger (`lib/logger.ts`)
- Hassas bilgi sızıntısı önleme
- Generic error mesajları

## Güvenlik Best Practices

### Environment Variables

Tüm hassas bilgiler environment variable'lar olarak saklanmalı:

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
PAYTR_MERCHANT_KEY=...
SMTP_PASS=...
```

**ÖNEMLİ**: `.env` dosyasını git'e commit etmeyin!

### Production Checklist

- [ ] `NEXTAUTH_SECRET` güçlü ve benzersiz bir değer
- [ ] `DATABASE_URL` production veritabanına işaret ediyor
- [ ] Rate limiting için Redis/Upstash kurulu
- [ ] Console.log'lar production'da devre dışı
- [ ] HTTPS aktif
- [ ] CORS ayarları doğru yapılandırılmış
- [ ] Error tracking (Sentry, vb.) kurulu
- [ ] Düzenli güvenlik güncellemeleri yapılıyor

### Güvenlik Güncellemeleri

Düzenli olarak güvenlik güncellemelerini kontrol edin:

```bash
npm audit
npm audit fix
```

## Bilinen Güvenlik Açıkları

### Düzeltilmiş

✅ **XSS Riski** - DOMPurify ile düzeltildi
✅ **Rate Limiting Eksikliği** - Login endpoint'ine eklendi
✅ **Console.log Bilgi Sızıntısı** - Logger wrapper ile düzeltildi

### İyileştirme Gereken

⚠️ **Rate Limiting Mimarisi** - Production için Redis kullanılmalı
⚠️ **Session Timeout** - NextAuth varsayılanları kullanılıyor (önerilen: 24 saat)

## Güvenlik Raporlama

Güvenlik açığı bulursanız, lütfen doğrudan proje sahibiyle iletişime geçin. Public issue açmayın.

## Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)

