#!/bin/bash

# Tek Tıkla Deploy Scripti
# Kullanım: ./scripts/deploy.sh

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploy işlemi başlatılıyor...${NC}\n"

# .env.deploy dosyasını kontrol et
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}Lütfen .env.deploy.example dosyasını kopyalayıp düzenleyin.${NC}"
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

# Git durumunu kontrol et (otomatik onay varsa atla)
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  Yerel değişiklikler var. Devam edilsin mi? (y/n)${NC}"
        read -r response
        if [ "$response" != "y" ]; then
            echo -e "${RED}Deploy iptal edildi.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

# Build işlemi
echo -e "${BLUE}📦 Proje build ediliyor...${NC}"
npm run build
echo -e "${GREEN}✓ Build tamamlandı\n${NC}"

# Dosyaları sunucuya gönder
echo -e "${BLUE}📤 Dosyalar sunucuya gönderiliyor...${NC}"

# SSH komutunu oluştur (şifre veya key)
SSH_CMD=""
RSYNC_CMD="rsync -avz --delete"

if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
    # Şifre ile bağlantı - sshpass kullan
    # sshpass'i bul (farklı konumlarda olabilir)
    SSHPASS_CMD=""
    for path in "/opt/homebrew/bin/sshpass" "/usr/local/bin/sshpass" "sshpass"; do
        if command -v "$path" &> /dev/null || [ -f "$path" ]; then
            SSHPASS_CMD="$path"
            break
        fi
    done
    
    if [ -z "$SSHPASS_CMD" ]; then
        echo -e "${RED}❌ sshpass bulunamadı! Şifre ile bağlantı için sshpass kurulumu gerekli.${NC}"
        echo -e "${YELLOW}macOS: brew install hudochenkov/sshpass/sshpass${NC}"
        echo -e "${YELLOW}Linux: apt-get install sshpass veya yum install sshpass${NC}"
        exit 1
    fi
    
    export SSHPASS="${DEPLOY_SSH_PASSWORD}"
    RSYNC_CMD="${SSHPASS_CMD} -e rsync -avz --delete"
    SSH_CMD="${SSHPASS_CMD} -e ssh"
else
    # Key ile bağlantı
    if [ -n "${DEPLOY_SSH_KEY}" ]; then
        RSYNC_CMD="rsync -avz --delete -e 'ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT}'"
        SSH_CMD="ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT}"
    else
        RSYNC_CMD="rsync -avz --delete -e 'ssh -p ${DEPLOY_SSH_PORT}'"
        SSH_CMD="ssh -p ${DEPLOY_SSH_PORT}"
    fi
fi

# Gerekli dosyaları gönder
eval "${RSYNC_CMD} \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '.env.deploy' \
    --exclude 'prisma/dev.db' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    ./ ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo -e "${GREEN}✓ Dosyalar gönderildi\n${NC}"

# Sunucuda deploy komutlarını çalıştır
echo -e "${BLUE}🔧 Sunucuda kurulum yapılıyor...${NC}"

# Docker kullanımı kontrolü
USE_DOCKER=${USE_DOCKER:-false}

if [ "$USE_DOCKER" = "true" ]; then
    echo -e "${GREEN}🐳 Docker modu aktif${NC}\n"
    
    ${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e
        cd "${DEPLOY_PATH}"
        
        echo "🐳 Docker Compose ile deploy yapılıyor..."
        
        # Docker Compose dosyasını kontrol et
        if [ ! -f docker-compose.prod.yml ]; then
            echo "⚠️  docker-compose.prod.yml bulunamadı, docker-compose.yml kullanılıyor..."
            COMPOSE_FILE="docker-compose.yml"
        else
            COMPOSE_FILE="docker-compose.prod.yml"
        fi
        
        # Container'ları durdur
        echo "⏸️  Mevcut container'lar durduruluyor..."
        docker-compose -f \$COMPOSE_FILE down || true
        
        # Image'ı build et
        echo "🔨 Docker image build ediliyor..."
        docker-compose -f \$COMPOSE_FILE build --no-cache app
        
        # Container'ları başlat
        echo "🚀 Container'lar başlatılıyor..."
        docker-compose -f \$COMPOSE_FILE up -d
        
        # Prisma migration'ları çalıştır
        echo "🔄 Prisma migration'ları uygulanıyor..."
        docker-compose -f \$COMPOSE_FILE exec -T app npx prisma generate || true
        docker-compose -f \$COMPOSE_FILE exec -T app npx prisma migrate deploy || true
        
        # Container durumunu göster
        echo "📊 Container durumu:"
        docker-compose -f \$COMPOSE_FILE ps
        
        echo "✅ Docker deploy tamamlandı!"
EOF
else
    echo -e "${GREEN}📦 Standalone modu aktif${NC}\n"
    
    ${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e
        cd "${DEPLOY_PATH}"
        
        echo "📦 Bağımlılıklar yükleniyor..."
        npm ci --production
        
        echo "🔨 Prisma client generate ediliyor..."
        npx prisma generate
        
        echo "🔄 PM2 ile uygulama yeniden başlatılıyor..."
        pm2 restart fitness-app || pm2 start npm --name "fitness-app" -- start
        
        echo "✅ Deploy tamamlandı!"
EOF
fi

echo -e "\n${GREEN}✅ Deploy başarıyla tamamlandı!${NC}"
echo -e "${BLUE}🌐 Uygulama: http://${DEPLOY_HOST}${NC}"
