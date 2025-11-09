#!/bin/bash

# Yedekleme Scripti
# Kullanım: ./scripts/backup.sh

# set -e kaldırıldı - hataları manuel kontrol edeceğiz

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}💾 Yedekleme işlemi başlatılıyor...${NC}\n"

# Yedek klasörü oluştur (absolute path)
BACKUP_DIR="$(pwd)/backups"
mkdir -p "$BACKUP_DIR"

# Tarih formatı
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
BACKUP_NAME="backup-${TIMESTAMP}"

# Geçici klasör
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Exit code başlangıç değeri
EXIT_CODE=0

echo -e "${GREEN}✓ Yedek klasörü hazırlandı${NC}"
echo -e "  Yedek adı: ${BACKUP_NAME}\n"

# 1. Veritabanı yedeği
echo -e "${BLUE}🗄️  Veritabanı yedeği alınıyor...${NC}"

if [ -f .env ]; then
    # DATABASE_URL'i güvenli şekilde oku (query parametrelerini temizle)
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | sed 's/?.*$//' || echo "")
    
    if [ ! -z "$DATABASE_URL" ]; then
        # PostgreSQL dump
        if command -v pg_dump &> /dev/null; then
            # pg_dump için URL'den query parametrelerini kaldır
            CLEAN_DB_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')
            pg_dump "$CLEAN_DB_URL" > "${TEMP_DIR}/database.sql" 2>&1 || {
                echo -e "${YELLOW}⚠️  pg_dump hatası, Prisma schema kullanılıyor...${NC}"
                rm -f "${TEMP_DIR}/database.sql"
            }
            if [ -f "${TEMP_DIR}/database.sql" ] && [ -s "${TEMP_DIR}/database.sql" ]; then
                echo -e "${GREEN}✓ Veritabanı yedeği alındı${NC}"
            else
                echo -e "${YELLOW}⚠️  Veritabanı yedeği alınamadı, Prisma schema kullanılıyor...${NC}"
                rm -f "${TEMP_DIR}/database.sql"
            fi
        else
            echo -e "${YELLOW}⚠️  pg_dump bulunamadı, Prisma schema kullanılıyor...${NC}"
        fi
        
        # Prisma schema ve migration'ları her zaman kopyala
        if [ -d "prisma" ]; then
            cp -r prisma "${TEMP_DIR}/prisma" 2>/dev/null || true
            echo -e "${GREEN}✓ Prisma schema kopyalandı${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL bulunamadı, veritabanı yedeği atlandı${NC}"
        # Prisma schema'yı yine de kopyala
        if [ -d "prisma" ]; then
            cp -r prisma "${TEMP_DIR}/prisma" 2>/dev/null || true
            echo -e "${GREEN}✓ Prisma schema kopyalandı${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı${NC}"
    # Prisma schema'yı yine de kopyala
    if [ -d "prisma" ]; then
        cp -r prisma "${TEMP_DIR}/prisma" 2>/dev/null || true
        echo -e "${GREEN}✓ Prisma schema kopyalandı${NC}"
    fi
fi

# 2. Önemli dosyaları yedekle
echo -e "${BLUE}📁 Dosyalar yedekleniyor...${NC}"

# Yedeklenecek klasörler ve dosyalar
BACKUP_ITEMS=(
    "public/uploads"
    ".env.example"
    "package.json"
    "package-lock.json"
    "next.config.mjs"
    "tailwind.config.js"
    "tsconfig.json"
    "components"
    "lib"
    "app"
    "scripts"
)

for item in "${BACKUP_ITEMS[@]}"; do
    if [ -e "$item" ]; then
        cp -r "$item" "${TEMP_DIR}/" 2>/dev/null || {
            echo -e "  ${YELLOW}⚠️  $item kopyalanamadı${NC}"
        }
        if [ $? -eq 0 ]; then
            echo -e "  ✓ $item"
        fi
    fi
done

# 3. Yedek bilgileri dosyası oluştur
ITEMS_JSON="[]"
if command -v jq &> /dev/null; then
    ITEMS_JSON=$(ls -1 "${TEMP_DIR}" 2>/dev/null | jq -R . | jq -s . 2>/dev/null || echo '[]')
fi

VERSION="unknown"
if [ -f "package.json" ] && command -v node &> /dev/null; then
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
fi

NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
DATE_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
HAS_DB=$([ -f "${TEMP_DIR}/database.sql" ] && echo "true" || echo "false")

cat > "${TEMP_DIR}/backup-info.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "${DATE_UTC}",
  "version": "${VERSION}",
  "node_version": "${NODE_VERSION}",
  "has_database": "${HAS_DB}",
  "items": ${ITEMS_JSON}
}
EOF

# 4. Tüm yedeği sıkıştır
echo -e "\n${BLUE}📦 Yedek sıkıştırılıyor...${NC}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
cd "$TEMP_DIR"
tar -czf "$BACKUP_FILE" .
cd - > /dev/null

# 5. Yedek boyutunu göster
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Yedek oluşturuldu: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})${NC}\n"
else
    echo -e "${RED}❌ Yedek dosyası oluşturulamadı${NC}\n"
    exit 1
fi

# 6. Yedek bilgilerini göster
if command -v jq &> /dev/null; then
    echo -e "${BLUE}📋 Yedek Bilgileri:${NC}"
    cat "${TEMP_DIR}/backup-info.json" | jq . 2>/dev/null || cat "${TEMP_DIR}/backup-info.json"
else
    echo -e "${BLUE}📋 Yedek Bilgileri:${NC}"
    cat "${TEMP_DIR}/backup-info.json"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Yedekleme tamamlandı!${NC}"
    echo -e "${YELLOW}Yedek konumu: ${BACKUP_FILE}${NC}"
else
    echo -e "\n${RED}❌ Yedekleme başarısız oldu!${NC}"
fi

exit $EXIT_CODE
