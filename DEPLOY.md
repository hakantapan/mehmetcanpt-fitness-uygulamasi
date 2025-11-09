# 🚀 Deploy Kılavuzu

Bu proje için tek tıkla deploy sistemi kurulmuştur. İki yöntemle deploy yapabilirsiniz:

## 📋 Ön Hazırlık

### 1. Sunucu Ayarlarını Yapılandırma

```bash
# Örnek dosyayı kopyalayın
cp scripts/deploy.env.example .env.deploy

# .env.deploy dosyasını düzenleyin
nano .env.deploy
```

`.env.deploy` dosyasına şu bilgileri girin:
- `DEPLOY_HOST`: Sunucu IP veya domain adresi
- `DEPLOY_USER`: SSH kullanıcı adı (genellikle `root` veya `ubuntu`)
- `DEPLOY_PATH`: Projenin sunucuda bulunacağı dizin (örn: `/var/www/fitness-app`)

### 2. SSH Key Ayarlama (Önerilen)

SSH key-based authentication kullanmanız önerilir:

```bash
# SSH key oluştur (eğer yoksa)
ssh-keygen -t rsa -b 4096

# Sunucuya key kopyala
ssh-copy-id user@your-server.com

# Test et
ssh user@your-server.com
```

### 3. Sunucuda Gerekli Kurulumlar

Sunucuda şunların kurulu olması gerekir:

```bash
# Node.js 18+ kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu (process manager)
sudo npm install -g pm2

# PostgreSQL kurulumu (eğer sunucuda çalışacaksa)
sudo apt-get install postgresql postgresql-contrib

# Prisma CLI
npm install -g prisma
```

### 4. Sunucuda Proje Dizini Oluşturma

```bash
# Sunucuda dizin oluştur
ssh user@your-server.com
sudo mkdir -p /var/www/fitness-app
sudo chown -R $USER:$USER /var/www/fitness-app
```

## 🎯 Deploy Yöntemleri

### Yöntem 1: Tek Tıkla Deploy (Yerel)

#### Sadece Kodu Deploy Et

```bash
npm run deploy
```

veya

```bash
./scripts/deploy.sh
```

#### Sadece Veritabanını Senkronize Et

```bash
npm run deploy:db
```

veya

```bash
./scripts/sync-db.sh
```

#### Hem Kodu Hem Veritabanını Deploy Et

```bash
npm run deploy:all
```

veya

```bash
./scripts/deploy-all.sh
```

### Yöntem 2: GitHub Actions ile Otomatik Deploy

GitHub'a push yaptığınızda otomatik olarak deploy edilir.

#### GitHub Secrets Ayarlama

GitHub repository'nizde şu secrets'ları ekleyin:

1. Repository → Settings → Secrets and variables → Actions
2. Şu secrets'ları ekleyin:
   - `DEPLOY_HOST`: Sunucu IP veya domain
   - `DEPLOY_USER`: SSH kullanıcı adı
   - `DEPLOY_PATH`: Proje dizini
   - `DEPLOY_SSH_KEY`: SSH private key içeriği

#### SSH Key'i GitHub'a Ekleme

```bash
# SSH private key'i okuyun
cat ~/.ssh/id_rsa

# Çıktıyı kopyalayıp GitHub Secrets'a DEPLOY_SSH_KEY olarak ekleyin
```

#### Manuel Deploy Tetikleme

GitHub Actions sekmesinden "Deploy to Production" workflow'unu manuel olarak çalıştırabilirsiniz.

## 📝 Deploy İşlem Adımları

Deploy scripti şunları yapar:

1. ✅ Projeyi build eder (`npm run build`)
2. ✅ Dosyaları sunucuya gönderir (rsync ile)
3. ✅ Sunucuda bağımlılıkları yükler (`npm ci --production`)
4. ✅ Prisma client'ı generate eder
5. ✅ PM2 ile uygulamayı yeniden başlatır
6. ✅ (Opsiyonel) Veritabanı migration'larını çalıştırır

## 🗄️ Veritabanı Yönetimi

### Migration Oluşturma

```bash
# Yeni migration oluştur
npx prisma migrate dev --name migration_name

# Migration'ı deploy et (sunucuda)
npm run deploy:db
```

### Veritabanı Senkronizasyonu

```bash
# Sadece veritabanını senkronize et
npm run deploy:db
```

## 🔧 Sorun Giderme

### SSH Bağlantı Sorunu

```bash
# SSH bağlantısını test et
ssh user@your-server.com

# SSH key'i kontrol et
ssh -v user@your-server.com
```

### PM2 Sorunları

```bash
# Sunucuda PM2 durumunu kontrol et
ssh user@your-server.com
pm2 list
pm2 logs fitness-app

# PM2'yi yeniden başlat
pm2 restart fitness-app
```

### Veritabanı Bağlantı Sorunu

```bash
# Sunucuda .env dosyasını kontrol et
ssh user@your-server.com
cd /var/www/fitness-app
cat .env | grep DATABASE_URL

# Prisma migration durumunu kontrol et
npx prisma migrate status
```

## 📚 Ek Kaynaklar

- [PM2 Dokümantasyonu](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [GitHub Actions](https://docs.github.com/en/actions)

## ⚠️ Önemli Notlar

1. **`.env.deploy` dosyasını git'e commit etmeyin!** (zaten .gitignore'da)
2. **Production environment variables'ları sunucuda `.env` dosyasında tutun**
3. **İlk deploy'dan önce sunucuda PostgreSQL'in çalıştığından emin olun**
4. **PM2 kurulumunu yapmayı unutmayın**
5. **SSH key-based authentication kullanın (güvenlik için)**

