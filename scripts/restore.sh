#!/bin/bash

# Geri Yükleme Scripti
# Kullanım: ./scripts/restore.sh <backup-file.tar.gz>

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Kullanım: ./scripts/restore.sh <backup-file.tar.gz>${NC}"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Yedek dosyası bulunamadı: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Geri yükleme işlemi başlatılıyor...${NC}\n"
echo -e "${YELLOW}⚠️  Bu işlem mevcut dosyaların üzerine yazacak!${NC}"

# Otomatik onay kontrolü
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

# Geçici klasör
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Yedeği aç
echo -e "${BLUE}📦 Yedek açılıyor...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
echo -e "${GREEN}✓ Yedek açıldı\n${NC}"

# Yedek bilgilerini göster
if [ -f "${TEMP_DIR}/backup-info.json" ]; then
    echo -e "${BLUE}📋 Yedek Bilgileri:${NC}"
    if command -v jq &> /dev/null; then
        cat "${TEMP_DIR}/backup-info.json" | jq .
    else
        cat "${TEMP_DIR}/backup-info.json"
    fi
    echo ""
fi

# 1. Veritabanını geri yükle
if [ -f "${TEMP_DIR}/database.sql" ]; then
    echo -e "${BLUE}🗄️  Veritabanı geri yükleniyor...${NC}"
    
    if [ -f .env ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
        if [ ! -z "$DATABASE_URL" ]; then
            if command -v psql &> /dev/null; then
                # Veritabanını temizle ve geri yükle
                psql "$DATABASE_URL" < "${TEMP_DIR}/database.sql"
                echo -e "${GREEN}✓ Veritabanı geri yüklendi${NC}\n"
            else
                echo -e "${YELLOW}⚠️  psql bulunamadı, veritabanı geri yükleme atlandı${NC}"
                echo -e "${YELLOW}Manuel olarak: psql <DATABASE_URL> < ${TEMP_DIR}/database.sql${NC}\n"
            fi
        else
            echo -e "${YELLOW}⚠️  DATABASE_URL bulunamadı, veritabanı geri yükleme atlandı${NC}\n"
        fi
    else
        echo -e "${YELLOW}⚠️  .env dosyası bulunamadı${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  Veritabanı yedeği bulunamadı${NC}\n"
fi

# 2. Dosyaları geri yükle
echo -e "${BLUE}📁 Dosyalar geri yükleniyor...${NC}"

# Geri yüklenecek öğeler
RESTORE_ITEMS=(
    "prisma"
    "public/uploads"
    "components"
    "lib"
    "app"
    "scripts"
)

for item in "${RESTORE_ITEMS[@]}"; do
    if [ -d "${TEMP_DIR}/${item}" ] || [ -f "${TEMP_DIR}/${item}" ]; then
        # Mevcut dosyayı yedekle (opsiyonel)
        if [ -e "$item" ]; then
            mkdir -p ".backup-restore"
            cp -r "$item" ".backup-restore/${item}.backup.$(date +%s)" 2>/dev/null || true
        fi
        
        # Geri yükle
        rm -rf "$item"
        cp -r "${TEMP_DIR}/${item}" "$item" 2>/dev/null || cp "${TEMP_DIR}/${item}" "$item"
        echo -e "  ✓ $item"
    fi
done

# 3. Config dosyalarını geri yükle (dikkatli)
if [ -f "${TEMP_DIR}/package.json" ]; then
    echo -e "${BLUE}⚙️  Config dosyaları kontrol ediliyor...${NC}"
    
    # package.json'u karşılaştır ve güncelle
    if ! cmp -s "package.json" "${TEMP_DIR}/package.json" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  package.json farklı, yedekleniyor...${NC}"
        cp package.json package.json.backup.$(date +%s)
        cp "${TEMP_DIR}/package.json" package.json
        echo -e "${GREEN}✓ package.json güncellendi (npm install çalıştırmanız gerekebilir)${NC}"
    fi
fi

echo -e "\n${GREEN}✅ Geri yükleme tamamlandı!${NC}"
echo -e "${YELLOW}Not: Bağımlılıkları güncellemek için: npm install${NC}"
echo -e "${YELLOW}Not: Prisma client'ı güncellemek için: npx prisma generate${NC}"

