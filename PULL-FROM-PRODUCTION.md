# ⬇️ Production'dan Local'e Veri Çekme Kılavuzu

Canlı sunucudaki (production) verileri yerel makinenize çekmek için kullanabileceğiniz scriptler.

## 🎯 Kullanım Senaryoları

1. **Veritabanı**: Production veritabanını local'e çekmek
2. **Dosyalar**: Production'daki uploads dosyalarını local'e çekmek
3. **Hepsi**: Hem veritabanı hem dosyaları çekmek

## 📋 Ön Hazırlık

`.env.deploy` dosyasının doğru yapılandırıldığından emin olun:

```bash
# .env.deploy dosyasını kontrol edin
cat .env.deploy
```

## 🚀 Kullanım

### 1. Tüm Verileri Çekme (Veritabanı + Dosyalar)

```bash
npm run pull:production
```

veya

```bash
./scripts/pull-from-production.sh all
```

### 2. Sadece Veritabanını Çekme

```bash
npm run pull:db
```

veya

```bash
./scripts/pull-db-docker.sh
```

### 3. Sadece Dosyaları Çekme

```bash
./scripts/pull-from-production.sh files
```

### 4. Sadece Veritabanını Çekme (Genel Script)

```bash
./scripts/pull-from-production.sh db
```

## 🔄 Otomatik Çekme (Watch Modu)

Belirli aralıklarla otomatik olarak production'dan veri çekmek için:

```bash
npm run watch:pull
```

Veya özel interval ile:

```bash
./scripts/watch-pull.sh 600  # Her 10 dakikada bir
```

**Varsayılan interval**: 300 saniye (5 dakika)

## 📝 İşlem Adımları

### Veritabanı Çekme İşlemi

1. ✅ Production'da Docker container içinden backup oluşturulur
2. ✅ Backup dosyası local'e indirilir
3. ✅ Local veritabanına restore edilir
4. ✅ Prisma client yeniden generate edilir

### Dosya Çekme İşlemi

1. ✅ Production'daki `public/uploads/` klasörü local'e çekilir
2. ✅ Mevcut dosyalar üzerine yazılır

## ⚠️ Önemli Uyarılar

### Veritabanı Çekme

- ⚠️ **Yerel veritabanınız silinecek ve production veritabanı ile değiştirilecek!**
- ⚠️ **Önemli verileriniz varsa önce yedek alın**
- ⚠️ **SQLite kullanıyorsanız PostgreSQL backup'ı restore edilemez**

### Dosya Çekme

- ⚠️ **Yerel uploads dosyalarınız production dosyaları ile değiştirilecek!**
- ⚠️ **Önemli dosyalarınız varsa önce yedek alın**

## 🔧 Gereksinimler

### Veritabanı Restore İçin

- `psql` komutu kurulu olmalı (PostgreSQL client)
- `.env.local` dosyasında `DATABASE_URL` tanımlı olmalı

```bash
# PostgreSQL client kurulumu
# macOS
brew install postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-client

# Linux (CentOS/RHEL)
sudo yum install postgresql
```

## 📊 Örnek Kullanım

### Senaryo 1: Production Veritabanını Test Etmek

```bash
# Production veritabanını çek
npm run pull:db

# Local'de test et
npm run dev
```

### Senaryo 2: Production Dosyalarını İndirmek

```bash
# Sadece dosyaları çek
./scripts/pull-from-production.sh files
```

### Senaryo 3: Her Şeyi Senkronize Etmek

```bash
# Tüm verileri çek
npm run pull:production
```

### Senaryo 4: Otomatik Senkronizasyon

```bash
# Her 5 dakikada bir otomatik çek
npm run watch:pull
```

## 🐛 Sorun Giderme

### Veritabanı Restore Hatası

```bash
# DATABASE_URL'i kontrol et
cat .env.local | grep DATABASE_URL

# psql'in kurulu olduğunu kontrol et
which psql

# Manuel restore
psql $DATABASE_URL < backups/backup-YYYYMMDD-HHMMSS.sql
```

### SSH Bağlantı Sorunu

```bash
# SSH bağlantısını test et
ssh user@your-server.com

# SSH key'i kontrol et
ssh -v user@your-server.com
```

### Backup Dosyası Bulunamadı

```bash
# Production'da backup dosyalarını kontrol et
ssh user@your-server.com
cd /var/www/fitness-app
ls -la backups/
```

## 💡 İpuçları

1. **Yedek Alın**: Production'dan çekmeden önce local verilerinizi yedekleyin
2. **Git Kullanın**: Kod değişiklikleri için Git kullanın (production'dan kod çekmeyin)
3. **Otomatik Çekme**: Watch modunu sadece geliştirme için kullanın
4. **Güvenlik**: Production verilerini local'de güvenli tutun

## 📚 İlgili Komutlar

- `npm run deploy:docker` - Local'den production'a deploy
- `npm run watch:deploy` - Otomatik deploy (local → production)
- `npm run watch:pull` - Otomatik çekme (production → local)
- `npm run backup` - Local veritabanı yedekleme

## 🎯 Hızlı Referans

```bash
# Production'dan veri çek
npm run pull:production      # Hepsi
npm run pull:db              # Sadece veritabanı

# Local'den production'a gönder
npm run deploy:all:docker    # Hepsi
npm run deploy:db:docker     # Sadece veritabanı

# Otomatik modlar
npm run watch:deploy        # Local → Production (otomatik)
npm run watch:pull          # Production → Local (otomatik)
```

