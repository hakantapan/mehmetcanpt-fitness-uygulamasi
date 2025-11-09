#!/bin/bash

# Production'dan Local'e Veritabanı Çekme Scripti (Docker)
# Kullanım: ./scripts/pull-db-docker.sh

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Production'dan veritabanı çekme işlemi başlatılıyor...${NC}\n"

# .env.deploy dosyasını kontrol et
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    exit 1
fi

source .env.deploy

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_PATH" ]; then
    echo -e "${RED}❌ .env.deploy dosyasında gerekli bilgiler eksik!${NC}"
    exit 1
fi

# SSH komutunu oluştur
SSH_CMD=""
if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
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
    if [ -n "${DEPLOY_SSH_KEY}" ]; then
        SSH_CMD="ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}"
    else
        SSH_CMD="ssh -p ${DEPLOY_SSH_PORT:-22}"
    fi
fi

# Onay
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  Bu işlem yerel veritabanınızı production veritabanı ile değiştirecek.${NC}"
    echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
fi

# Production'dan backup oluştur
echo -e "${BLUE}📦 Production'da backup oluşturuluyor...${NC}"

BACKUP_FILE=$(${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    set -e
    cd "${DEPLOY_PATH}"
    
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    BACKUP_FILE="backup-\$(date +%Y%m%d-%H%M%S).sql"
    mkdir -p backups
    \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T postgres pg_dump -U \${POSTGRES_USER:-postgres} \${POSTGRES_DB:-fitness_app} > backups/\${BACKUP_FILE}
    echo "backups/\${BACKUP_FILE}"
EOF
)

echo -e "${GREEN}✓ Backup oluşturuldu: ${BACKUP_FILE}${NC}"

# Backup'ı local'e indir
echo -e "${BLUE}📥 Backup indiriliyor...${NC}"
mkdir -p backups

RSYNC_CMD="rsync -avz"
if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
    SSHPASS_CMD=""
    for path in "/opt/homebrew/bin/sshpass" "/usr/local/bin/sshpass" "sshpass"; do
        if command -v "$path" &> /dev/null || [ -f "$path" ]; then
            SSHPASS_CMD="$path"
            break
        fi
    done
    export SSHPASS="${DEPLOY_SSH_PASSWORD}"
    RSYNC_CMD="${SSHPASS_CMD} -e rsync -avz"
elif [ -n "${DEPLOY_SSH_KEY}" ]; then
    RSYNC_CMD="rsync -avz -e 'ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}'"
else
    RSYNC_CMD="rsync -avz -e 'ssh -p ${DEPLOY_SSH_PORT:-22}'"
fi

eval "${RSYNC_CMD} ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/${BACKUP_FILE} ./backups/"

LOCAL_BACKUP="./backups/$(basename $BACKUP_FILE)"
echo -e "${GREEN}✓ Backup indirildi: ${LOCAL_BACKUP}${NC}"

# Local veritabanına restore et
echo -e "${BLUE}🔄 Local veritabanına restore ediliyor...${NC}"

# .env.local'den DATABASE_URL'i al
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL bulunamadı! .env.local dosyasını kontrol edin.${NC}"
    exit 1
fi

# PostgreSQL restore
if command -v psql &> /dev/null; then
    # Veritabanını temizle ve restore et
    echo -e "${BLUE}Veritabanı restore ediliyor...${NC}"
    
    # Drop ve recreate (dikkatli!)
    echo -e "${YELLOW}⚠️  Mevcut veritabanı silinecek ve yeniden oluşturulacak.${NC}"
    if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
        echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
        read -r response
        if [ "$response" != "y" ]; then
            echo -e "${RED}İşlem iptal edildi. Backup hazır: ${LOCAL_BACKUP}${NC}"
            exit 1
        fi
    fi
    
    # DATABASE_URL'den veritabanı adını çıkar
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Veritabanını drop ve recreate et
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true
    
    # Restore et
    psql "$DATABASE_URL" < "$LOCAL_BACKUP"
    
    echo -e "${GREEN}✅ Veritabanı başarıyla restore edildi!${NC}"
    
    # Prisma client'ı yeniden generate et
    echo -e "${BLUE}🔄 Prisma client generate ediliyor...${NC}"
    npx prisma generate
    
    echo -e "${GREEN}✅ İşlem tamamlandı!${NC}"
else
    echo -e "${YELLOW}⚠️  psql bulunamadı. Backup hazır: ${LOCAL_BACKUP}${NC}"
    echo -e "${YELLOW}Manuel restore: psql \$DATABASE_URL < ${LOCAL_BACKUP}${NC}"
fi

