#!/bin/bash

# Sunucudan Local'e Çekme Scripti
# Kullanım: ./scripts/pull-from-server.sh

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⬇️  Sunucudan local'e çekme işlemi başlatılıyor...${NC}\n"

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

# Otomatik onay kontrolü
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  Bu işlem sunucudaki dosyaları local'e çekecek.${NC}"
    echo -e "${YELLOW}Mevcut local dosyalar üzerine yazılabilir. Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

# Sunucudan dosyaları çek
echo -e "${BLUE}📥 Sunucudan dosyalar çekiliyor...${NC}"

# Önemli dosyaları çek (node_modules, .next gibi büyük klasörleri hariç tut)
rsync -avz \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '.env.deploy' \
    --exclude 'prisma/dev.db' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    --exclude 'uploads/' \
    ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/ ./

echo -e "${GREEN}✓ Dosyalar çekildi\n${NC}"

# Veritabanı çekme seçeneği
if [ "$PULL_DATABASE" = "true" ]; then
    echo -e "${BLUE}🗄️  Veritabanı çekiliyor...${NC}"
    
    # Sunucuda veritabanı dump'ı oluştur
    ssh ${DEPLOY_USER}@${DEPLOY_HOST} << EOF
        set -e
        cd ${DEPLOY_PATH}
        
        echo "📦 Veritabanı dump'ı oluşturuluyor..."
        # PostgreSQL dump
        if command -v pg_dump &> /dev/null; then
            export \$(cat .env | grep DATABASE_URL | xargs)
            DB_NAME=\$(echo \$DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
            pg_dump \$DATABASE_URL > /tmp/db_dump.sql
            echo "✅ Dump oluşturuldu: /tmp/db_dump.sql"
        else
            echo "⚠️  pg_dump bulunamadı, Prisma migrate kullanılıyor..."
        fi
EOF
    
    # Dump dosyasını local'e çek
    scp ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/db_dump.sql ./prisma/db_dump.sql 2>/dev/null || echo -e "${YELLOW}⚠️  Veritabanı dump'ı çekilemedi (opsiyonel)${NC}"
    
    echo -e "${GREEN}✓ Veritabanı dump'ı çekildi (prisma/db_dump.sql)\n${NC}"
    echo -e "${YELLOW}Not: Veritabanını restore etmek için: psql <DATABASE_URL> < prisma/db_dump.sql${NC}\n"
fi

echo -e "${GREEN}✅ Sunucudan çekme işlemi tamamlandı!${NC}"

