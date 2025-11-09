#!/bin/bash

# Sunucuda GitHub'dan Pull Scripti
# Kullanım: Sunucuda çalıştırılır

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⬇️  GitHub'dan pull işlemi başlatılıyor...${NC}\n"

# Git repo kontrolü
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Bu dizin bir git repository değil!${NC}"
    exit 1
fi

# Remote kontrolü
REMOTE_URL=$(git config --get remote.origin.url)
if [ -z "$REMOTE_URL" ]; then
    echo -e "${RED}❌ Git remote (origin) bulunamadı!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git repository bulundu${NC}"
echo -e "  Remote: ${REMOTE_URL}\n"

# Branch bilgisi
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET_BRANCH="${GITHUB_BRANCH:-main}"
echo -e "${BLUE}📋 Mevcut branch: ${CURRENT_BRANCH}${NC}"
echo -e "${BLUE}📋 Hedef branch: ${TARGET_BRANCH}${NC}\n"

# Otomatik onay kontrolü
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  Bu işlem GitHub'dan güncellemeleri çekecek.${NC}"
    echo -e "${YELLOW}Mevcut dosyalar üzerine yazılabilir. Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

# Fetch yap
echo -e "${BLUE}📥 GitHub'dan güncellemeler çekiliyor...${NC}"
git fetch origin "${TARGET_BRANCH}" || {
    echo -e "${RED}❌ Fetch başarısız!${NC}"
    exit 1
}

# Pull yap
echo -e "${BLUE}🔄 Pull yapılıyor...${NC}"
if git pull origin "${TARGET_BRANCH}"; then
    echo -e "${GREEN}✓ Pull başarılı!${NC}\n"
    
    # Bağımlılıkları güncelle
    if [ -f "package.json" ]; then
        echo -e "${BLUE}📦 Bağımlılıklar güncelleniyor...${NC}"
        npm ci --production || npm install --production
        echo -e "${GREEN}✓ Bağımlılıklar güncellendi${NC}\n"
    fi
    
    # Prisma client generate
    if [ -f "prisma/schema.prisma" ]; then
        echo -e "${BLUE}🔨 Prisma client generate ediliyor...${NC}"
        npx prisma generate
        echo -e "${GREEN}✓ Prisma client generate edildi${NC}\n"
    fi
    
    # Build (eğer gerekirse)
    if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
        echo -e "${BLUE}📦 Proje build ediliyor...${NC}"
        npm run build
        echo -e "${GREEN}✓ Build tamamlandı${NC}\n"
    fi
    
    # PM2 restart (eğer çalışıyorsa)
    if command -v pm2 &> /dev/null; then
        echo -e "${BLUE}🔄 PM2 yeniden başlatılıyor...${NC}"
        pm2 restart all || pm2 restart fitness-app || echo -e "${YELLOW}⚠️  PM2 restart edilemedi (muhtemelen çalışmıyor)${NC}"
        echo -e "${GREEN}✓ PM2 yeniden başlatıldı${NC}\n"
    fi
    
    echo -e "${GREEN}✅ Pull ve kurulum tamamlandı!${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Pull başarısız!${NC}"
    echo -e "${YELLOW}Çakışmalar olabilir. Manuel kontrol edin.${NC}\n"
    exit 1
fi

