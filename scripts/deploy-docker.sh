#!/bin/bash

# Docker Tabanlı Deploy Scripti
# Kullanım: ./scripts/deploy-docker.sh

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Docker Deploy işlemi başlatılıyor...${NC}\n"

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
        RSYNC_CMD="rsync -avz --delete -e 'ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}'"
        SSH_CMD="ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}"
    else
        RSYNC_CMD="rsync -avz --delete -e 'ssh -p ${DEPLOY_SSH_PORT:-22}'"
        SSH_CMD="ssh -p ${DEPLOY_SSH_PORT:-22}"
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
    --exclude 'backups' \
    ./ ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo -e "${GREEN}✓ Dosyalar gönderildi\n${NC}"

# Sunucuda Docker deploy komutlarını çalıştır
echo -e "${BLUE}🔧 Sunucuda Docker ile kurulum yapılıyor...${NC}"

${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    set -e
    cd "${DEPLOY_PATH}"
    
    # Docker ve Docker Compose kontrolü
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker bulunamadı! Lütfen Docker'ı kurun."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose bulunamadı! Lütfen Docker Compose'u kurun."
        exit 1
    fi
    
    # Docker Compose komutunu belirle
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    echo "📦 Docker image'ları build ediliyor..."
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml build --no-cache
    
    echo "🛑 Mevcut container'lar durduruluyor..."
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml down || true
    
    echo "🚀 Container'lar başlatılıyor..."
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d
    
    echo "⏳ Container'ların hazır olması bekleniyor..."
    sleep 5
    
    echo "📊 Container durumları:"
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml ps
    
    echo "✅ Docker deploy tamamlandı!"
EOF

echo -e "\n${GREEN}✅ Docker Deploy başarıyla tamamlandı!${NC}"
echo -e "${BLUE}🌐 Uygulama: http://${DEPLOY_HOST}:${APP_PORT:-3000}${NC}"
echo -e "${YELLOW}💡 Logları görmek için: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml logs -f'${NC}"

