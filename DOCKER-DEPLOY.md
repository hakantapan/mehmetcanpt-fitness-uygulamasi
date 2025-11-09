# 🐳 Docker Tabanlı Deployment Kılavuzu

Bu proje için Docker tabanlı otomatik deployment sistemi kurulmuştur. Yerel değişikliklerinizi otomatik olarak sunucuya deploy edebilirsiniz.

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
- `POSTGRES_PASSWORD`: Veritabanı şifresi
- `NEXTAUTH_URL`: Production URL'iniz
- `NEXTAUTH_SECRET`: NextAuth secret key'iniz

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

### 3. Sunucuda İlk Kurulum

Sunucuda Docker ve Docker Compose'un kurulu olması gerekir. Otomatik kurulum için:

```bash
# Sunucuya bağlanın ve setup scriptini çalıştırın
ssh user@your-server.com 'bash -s' < scripts/setup-server.sh
```

Veya manuel olarak:

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose kontrolü (genellikle Docker ile birlikte gelir)
docker compose version
```

### 4. Sunucuda Proje Dizini ve .env Dosyası Oluşturma

```bash
# Sunucuda dizin oluştur
ssh user@your-server.com
sudo mkdir -p /var/www/fitness-app
sudo chown -R $USER:$USER /var/www/fitness-app
cd /var/www/fitness-app

# .env dosyası oluştur (production environment variables)
nano .env
```

Sunucudaki `.env` dosyasına şunları ekleyin:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=fitness_app
POSTGRES_PORT=5432

# App
APP_PORT=3000
NODE_ENV=production

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# Database URL (Docker Compose içinde otomatik oluşturulur)
DATABASE_URL=postgresql://postgres:your-secure-password-here@postgres:5432/fitness_app?schema=public

# Diğer environment variables'larınızı buraya ekleyin
```

## 🚀 Deploy Yöntemleri

### Yöntem 1: Tek Seferlik Docker Deploy

#### Sadece Kodu Deploy Et

```bash
npm run deploy:docker
```

veya

```bash
./scripts/deploy-docker.sh
```

#### Sadece Veritabanını Senkronize Et

```bash
npm run deploy:db:docker
```

veya

```bash
./scripts/sync-db-docker.sh
```

#### Hem Kodu Hem Veritabanını Deploy Et

```bash
npm run deploy:all:docker
```

veya

```bash
./scripts/deploy-all-docker.sh
```

### Yöntem 2: Otomatik Watch Modu (Önerilen)

Yerel dosyalarınızda yaptığınız değişiklikler otomatik olarak sunucuya deploy edilir:

```bash
npm run watch:deploy
```

veya

```bash
./scripts/watch-deploy.sh
```

**Watch modu için gereksinimler:**
- **macOS**: `brew install fswatch`
- **Linux**: `apt-get install inotify-tools`
- **Alternatif**: `npm install -g chokidar-cli`

Watch modu:
- Dosya değişikliklerini izler
- Değişiklik olduğunda otomatik deploy yapar
- Çoklu değişikliklerde tek deploy yapar (5 saniye gecikme ile)
- Ctrl+C ile durdurulabilir

## 📝 Deploy İşlem Adımları

Docker deploy scripti şunları yapar:

1. ✅ Projeyi build eder (`npm run build`)
2. ✅ Dosyaları sunucuya gönderir (rsync ile)
3. ✅ Sunucuda Docker image'ları build eder
4. ✅ Mevcut container'ları durdurur
5. ✅ Yeni container'ları başlatır
6. ✅ Prisma migration'larını çalıştırır
7. ✅ Uygulamayı başlatır

## 🗄️ Veritabanı Yönetimi

### Migration Oluşturma

```bash
# Yerel olarak yeni migration oluştur
npx prisma migrate dev --name migration_name

# Migration'ı sunucuya deploy et
npm run deploy:db:docker
```

### Veritabanı Senkronizasyonu

```bash
# Sadece veritabanını senkronize et
npm run deploy:db:docker
```

## 🔧 Docker Komutları

### Sunucuda Container Durumunu Kontrol Etme

```bash
ssh user@your-server.com
cd /var/www/fitness-app
docker-compose -f docker-compose.prod.yml ps
```

### Logları Görüntüleme

```bash
# Tüm loglar
docker-compose -f docker-compose.prod.yml logs -f

# Sadece app logları
docker-compose -f docker-compose.prod.yml logs -f app

# Sadece postgres logları
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Container'ları Yeniden Başlatma

```bash
ssh user@your-server.com
cd /var/www/fitness-app
docker-compose -f docker-compose.prod.yml restart
```

### Container'ları Durdurma

```bash
docker-compose -f docker-compose.prod.yml down
```

### Container'ları Başlatma

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Veritabanına Bağlanma

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d fitness_app
```

## 🔍 Sorun Giderme

### SSH Bağlantı Sorunu

```bash
# SSH bağlantısını test et
ssh user@your-server.com

# SSH key'i kontrol et
ssh -v user@your-server.com
```

### Docker Sorunları

```bash
# Docker servisini kontrol et
sudo systemctl status docker

# Docker loglarını kontrol et
journalctl -u docker.service

# Container loglarını kontrol et
docker-compose -f docker-compose.prod.yml logs
```

### Veritabanı Bağlantı Sorunu

```bash
# Container'ların çalıştığını kontrol et
docker-compose -f docker-compose.prod.yml ps

# Postgres container'ının sağlığını kontrol et
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# .env dosyasını kontrol et
cat .env | grep DATABASE_URL
```

### Build Sorunları

```bash
# Docker image'ları temizle ve yeniden build et
docker-compose -f docker-compose.prod.yml build --no-cache

# Tüm container ve image'ları temizle
docker-compose -f docker-compose.prod.yml down
docker system prune -a
```

## 📊 Avantajlar

Docker kullanmanın avantajları:

1. ✅ **Ortam Tutarlılığı**: Geliştirme ve production ortamları aynı
2. ✅ **Kolay Deployment**: Tek komutla deploy
3. ✅ **İzolasyon**: Uygulama ve veritabanı izole çalışır
4. ✅ **Kolay Rollback**: Eski image'a geri dönüş kolay
5. ✅ **Ölçeklenebilirlik**: Kolayca ölçeklendirilebilir
6. ✅ **Otomatik Senkronizasyon**: Watch modu ile otomatik deploy

## ⚠️ Önemli Notlar

1. **`.env.deploy` dosyasını git'e commit etmeyin!** (zaten .gitignore'da)
2. **Sunucudaki `.env` dosyasını güvenli tutun** - production secrets içerir
3. **İlk deploy'dan önce sunucuda Docker'ın kurulu olduğundan emin olun**
4. **SSH key-based authentication kullanın** (güvenlik için)
5. **Watch modu sadece geliştirme için kullanın** - production'da manuel deploy tercih edin
6. **Veritabanı yedeklerini düzenli alın** (`npm run backup`)

## 🎯 Hızlı Başlangıç

```bash
# 1. .env.deploy dosyasını oluştur
cp scripts/deploy.env.example .env.deploy
nano .env.deploy

# 2. Sunucuda ilk kurulumu yap
ssh user@server 'bash -s' < scripts/setup-server.sh

# 3. İlk deploy'u yap
npm run deploy:all:docker

# 4. Watch modunu başlat (otomatik deploy için)
npm run watch:deploy
```

Artık yerel değişiklikleriniz otomatik olarak sunucuya deploy edilecek! 🎉

