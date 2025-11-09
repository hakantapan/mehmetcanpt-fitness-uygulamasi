#!/bin/bash

# Docker Veritabanı Senkronizasyon Scripti
# Kullanım: ./scripts/sync-db-docker.sh

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Docker Veritabanı senkronizasyonu başlatılıyor...${NC}\n"

# .env.deploy dosyasını kontrol et
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}Lütfen scripts/deploy.env.example dosyasını kopyalayıp .env.deploy olarak düzenleyin.${NC}"
    exit 1
fi

# .env.deploy dosyasını yükle
source .env.deploy

# Gerekli değişkenleri kontrol et
if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_PATH" ]; then
    echo -e "${RED}❌ .env.deploy dosyasında DEPLOY_HOST, DEPLOY_USER veya DEPLOY_PATH eksik!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Sunucu bilgileri yüklendi${NC}"
echo -e "  Host: ${DEPLOY_HOST}"
echo -e "  User: ${DEPLOY_USER}"
echo -e "  Path: ${DEPLOY_PATH}\n"

# Otomatik onay için AUTO_CONFIRM kontrolü
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    # Uyarı
    echo -e "${YELLOW}⚠️  Bu işlem sunucudaki veritabanını migrate edecek.${NC}"
    echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

# SSH komutunu oluştur (şifre veya key)
SSH_CMD=""
if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
    # Şifre ile bağlantı - sshpass kullan
    SSHPASS_CMD=""
    for path in "/opt/homebrew/bin/sshpass" "/usr/local/bin/sshpass" "sshpass"; do
        if command -v "$path" &> /dev/null || [ -f "$path" ]; then
            SSHPASS_CMD="$path"
            break
        fi
    done
    
    if [ -z "$SSHPASS_CMD" ]; then
        echo -e "${RED}❌ sshpass bulunamadı!${NC}"
        exit 1
    fi
    
    export SSHPASS="${DEPLOY_SSH_PASSWORD}"
    SSH_CMD="${SSHPASS_CMD} -e ssh -p ${DEPLOY_SSH_PORT:-22}"
else
    # Key ile bağlantı
    if [ -n "${DEPLOY_SSH_KEY}" ]; then
        SSH_CMD="ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}"
    else
        SSH_CMD="ssh -p ${DEPLOY_SSH_PORT:-22}"
    fi
fi

# Sunucuda Docker container içinde migration çalıştır
echo -e "${BLUE}🔄 Docker container içinde migration'lar çalıştırılıyor...${NC}"

${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} << EOF
    set -e
    cd ${DEPLOY_PATH}
    
    # Docker Compose komutunu belirle
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    # App container'ının çalıştığını kontrol et
    if ! \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml ps | grep -q "fitness-app-prod.*Up"; then
        echo "❌ App container çalışmıyor! Önce deploy yapın."
        exit 1
    fi
    
    echo "📦 Prisma client generate ediliyor..."
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T app npx prisma generate
    
    echo "🔄 Veritabanı migration'ları uygulanıyor..."
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
    
    echo "✅ Veritabanı senkronizasyonu tamamlandı!"
EOF

echo -e "\n${GREEN}✅ Veritabanı başarıyla senkronize edildi!${NC}"

