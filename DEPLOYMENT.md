# 🚀 Deployment Hızlı Başlangıç Kılavuzu

Bu proje için **Docker tabanlı otomatik deployment** sistemi kurulmuştur. Yerel değişiklikleriniz otomatik olarak sunucuya deploy edilebilir.

## ⚡ Hızlı Başlangıç (3 Adım)

### 1. Sunucu Bilgilerini Ayarlayın

```bash
cp scripts/deploy.env.example .env.deploy
nano .env.deploy
```

`.env.deploy` dosyasına sunucu bilgilerinizi girin.

### 2. Sunucuda İlk Kurulumu Yapın

```bash
ssh user@your-server.com 'bash -s' < scripts/setup-server.sh
```

Sunucuda `.env` dosyasını oluşturun:

```bash
ssh user@your-server.com
cd /var/www/fitness-app
nano .env
```

Production environment variables'larınızı ekleyin.

### 3. İlk Deploy'u Yapın

```bash
npm run deploy:all:docker
```

## 🎯 Otomatik Deploy (Watch Modu)

Yerel dosyalarınızda yaptığınız değişiklikler otomatik olarak sunucuya deploy edilir:

```bash
npm run watch:deploy
```

Bu komut:
- ✅ Dosya değişikliklerini izler
- ✅ Değişiklik olduğunda otomatik deploy yapar
- ✅ Çoklu değişikliklerde tek deploy yapar (5 saniye gecikme)
- ✅ Ctrl+C ile durdurulabilir

**Watch modu için gereksinim:**
- macOS: `brew install fswatch`
- Linux: `apt-get install inotify-tools`

## 📋 Komutlar

### Docker Deploy Komutları (Local → Production)

```bash
# Sadece kodu deploy et
npm run deploy:docker

# Sadece veritabanını senkronize et
npm run deploy:db:docker

# Hem kodu hem veritabanını deploy et
npm run deploy:all:docker

# Otomatik watch modu (önerilen)
npm run watch:deploy
```

### Production'dan Çekme Komutları (Production → Local)

```bash
# Tüm verileri çek (veritabanı + dosyalar)
npm run pull:production

# Sadece veritabanını çek
npm run pull:db

# Otomatik çekme (belirli aralıklarla)
npm run watch:pull
```

**Not**: Production'dan veri çekerken yerel verileriniz üzerine yazılacaktır!

### Eski PM2 Deploy Komutları (Hala Kullanılabilir)

```bash
npm run deploy          # PM2 ile deploy
npm run deploy:db       # PM2 ile veritabanı senkronizasyonu
npm run deploy:all      # PM2 ile tam deploy
```

## 🐳 Docker Komutları (Sunucuda)

```bash
# Container durumunu kontrol et
docker-compose -f docker-compose.prod.yml ps

# Logları görüntüle
docker-compose -f docker-compose.prod.yml logs -f

# Container'ları yeniden başlat
docker-compose -f docker-compose.prod.yml restart

# Container'ları durdur
docker-compose -f docker-compose.prod.yml down

# Container'ları başlat
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Detaylı Dokümantasyon

- **Docker Deployment**: [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md) - Docker deployment detayları
- **Production'dan Çekme**: [PULL-FROM-PRODUCTION.md](./PULL-FROM-PRODUCTION.md) - Production'dan veri çekme detayları
- **Genel Deployment**: [DEPLOY.md](./DEPLOY.md) - PM2 deployment detayları

## ⚠️ Önemli Notlar

1. **`.env.deploy` dosyasını git'e commit etmeyin!**
2. **Sunucudaki `.env` dosyasını güvenli tutun**
3. **SSH key-based authentication kullanın**
4. **Watch modu sadece geliştirme için** - production'da manuel deploy tercih edin

## 🆘 Sorun mu Yaşıyorsunuz?

- [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md) dosyasındaki "Sorun Giderme" bölümüne bakın
- Container loglarını kontrol edin: `docker-compose -f docker-compose.prod.yml logs`
- SSH bağlantısını test edin: `ssh user@your-server.com`

