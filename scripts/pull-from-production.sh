#!/bin/bash

# Production'dan Local'e Veri Çekme Scripti
# Kullanım: ./scripts/pull-from-production.sh [db|files|all]

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# İşlem tipi (varsayılan: all)
PULL_TYPE=${1:-all}

echo -e "${BLUE}⬇️  Production'dan veri çekme işlemi başlatılıyor...${NC}\n"

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

# SSH komutunu oluştur (şifre veya key)
SSH_CMD=""
RSYNC_CMD="rsync -avz"

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
    RSYNC_CMD="${SSHPASS_CMD} -e rsync -avz"
    SSH_CMD="${SSHPASS_CMD} -e ssh"
else
    # Key ile bağlantı
    if [ -n "${DEPLOY_SSH_KEY}" ]; then
        RSYNC_CMD="rsync -avz -e 'ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}'"
        SSH_CMD="ssh -i ${DEPLOY_SSH_KEY} -p ${DEPLOY_SSH_PORT:-22}"
    else
        RSYNC_CMD="rsync -avz -e 'ssh -p ${DEPLOY_SSH_PORT:-22}'"
        SSH_CMD="ssh -p ${DEPLOY_SSH_PORT:-22}"
    fi
fi

# Veritabanı çekme fonksiyonu
pull_database() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Veritabanı Çekiliyor...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Otomatik onay kontrolü
    if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
        echo -e "${YELLOW}⚠️  Bu işlem yerel veritabanınızı production veritabanı ile değiştirecek.${NC}"
        echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
        read -r response
        if [ "$response" != "y" ]; then
            echo -e "${RED}İşlem iptal edildi.${NC}"
            return 1
        fi
    fi
    
    # Production'dan veritabanı backup'ı al
    echo -e "${BLUE}📦 Production'dan veritabanı backup'ı alınıyor...${NC}"
    
    ${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
        set -e
        cd "${DEPLOY_PATH}"
        
        # Docker Compose komutunu belirle
        if docker compose version &> /dev/null; then
            DOCKER_COMPOSE_CMD="docker compose"
        else
            DOCKER_COMPOSE_CMD="docker-compose"
        fi
        
        # Backup oluştur
        BACKUP_FILE="backup-\$(date +%Y%m%d-%H%M%S).sql"
        echo "Veritabanı backup'ı oluşturuluyor: \${BACKUP_FILE}"
        \${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml exec -T postgres pg_dump -U \${POSTGRES_USER:-postgres} \${POSTGRES_DB:-fitness_app} > backups/\${BACKUP_FILE}
        echo "Backup oluşturuldu: backups/\${BACKUP_FILE}"
EOF
    
    # En son backup dosyasını bul ve indir
    echo -e "${BLUE}📥 Backup dosyası indiriliyor...${NC}"
    
    LATEST_BACKUP=\$(${SSH_CMD} "${DEPLOY_USER}@${DEPLOY_HOST}" "ls -t ${DEPLOY_PATH}/backups/*.sql 2>/dev/null | head -1")
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ Backup dosyası bulunamadı!${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ En son backup: $(basename $LATEST_BACKUP)${NC}"
    
    # Backup'ı local'e indir
    mkdir -p backups
    eval "${RSYNC_CMD} ${DEPLOY_USER}@${DEPLOY_HOST}:${LATEST_BACKUP} ./backups/"
    
    BACKUP_FILE="./backups/$(basename $LATEST_BACKUP)"
    
    # Local veritabanına restore et
    echo -e "${BLUE}🔄 Local veritabanına restore ediliyor...${NC}"
    
    # Local veritabanı tipini kontrol et (SQLite veya PostgreSQL)
    if [ -f "prisma/dev.db" ]; then
        echo -e "${YELLOW}⚠️  SQLite veritabanı tespit edildi. PostgreSQL backup'ı SQLite'a restore edilemez.${NC}"
        echo -e "${YELLOW}Lütfen PostgreSQL kullanın veya manuel olarak verileri aktarın.${NC}"
        return 1
    fi
    
    # PostgreSQL için restore
    if command -v psql &> /dev/null; then
        # .env.local dosyasından DATABASE_URL'i al
        if [ -f .env.local ]; then
            source .env.local
        fi
        
        if [ -z "$DATABASE_URL" ]; then
            echo -e "${RED}❌ DATABASE_URL bulunamadı! .env.local dosyasını kontrol edin.${NC}"
            return 1
        fi
        
        # Veritabanını restore et
        echo -e "${BLUE}Veritabanı restore ediliyor...${NC}"
        psql "$DATABASE_URL" < "$BACKUP_FILE" || {
            echo -e "${YELLOW}⚠️  Restore sırasında bazı hatalar olabilir (ör: mevcut tablolar). Devam ediliyor...${NC}"
        }
        
        echo -e "${GREEN}✓ Veritabanı restore edildi${NC}"
    else
        echo -e "${YELLOW}⚠️  psql bulunamadı. Backup dosyası hazır: ${BACKUP_FILE}${NC}"
        echo -e "${YELLOW}Manuel olarak restore edebilirsiniz: psql DATABASE_URL < ${BACKUP_FILE}${NC}"
    fi
    
    echo -e "${GREEN}✅ Veritabanı başarıyla çekildi!${NC}\n"
}

# Dosyaları çekme fonksiyonu
pull_files() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Dosyalar Çekiliyor...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Otomatik onay kontrolü
    if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
        echo -e "${YELLOW}⚠️  Bu işlem yerel dosyalarınızı production dosyaları ile değiştirecek.${NC}"
        echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
        read -r response
        if [ "$response" != "y" ]; then
            echo -e "${RED}İşlem iptal edildi.${NC}"
            return 1
        fi
    fi
    
    echo -e "${BLUE}📥 Production'dan dosyalar indiriliyor...${NC}"
    
    # Uploads klasörünü çek
    echo -e "${BLUE}📁 Uploads klasörü çekiliyor...${NC}"
    mkdir -p public/uploads
    eval "${RSYNC_CMD} ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/public/uploads/ ./public/uploads/"
    
    echo -e "${GREEN}✅ Dosyalar başarıyla çekildi!${NC}\n"
}

# Tümünü çekme
if [ "$PULL_TYPE" = "db" ]; then
    pull_database
elif [ "$PULL_TYPE" = "files" ]; then
    pull_files
elif [ "$PULL_TYPE" = "all" ]; then
    pull_database
    pull_files
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ Tüm veriler başarıyla çekildi!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
else
    echo -e "${RED}❌ Geçersiz işlem tipi: $PULL_TYPE${NC}"
    echo -e "${YELLOW}Kullanım: $0 [db|files|all]${NC}"
    exit 1
fi

