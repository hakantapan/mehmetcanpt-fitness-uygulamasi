#!/bin/bash

# GitHub'a Push Scripti
# Kullanım: ./scripts/github-push.sh

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📤 GitHub'a push işlemi başlatılıyor...${NC}\n"

# Git durumunu kontrol et
if [ -z "$AUTO_CONFIRM" ] || [ "$AUTO_CONFIRM" != "true" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  Yerel değişiklikler var. Devam edilsin mi? (y/n)${NC}"
        read -r response
        if [ "$response" != "y" ]; then
            echo -e "${RED}Push iptal edildi.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}Otomatik onay aktif - devam ediliyor...${NC}\n"
fi

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
echo -e "${BLUE}📋 Mevcut branch: ${CURRENT_BRANCH}${NC}\n"

# Değişiklikleri stage'e ekle
echo -e "${BLUE}📝 Değişiklikler stage'e ekleniyor...${NC}"
git add .

# Commit oluştur
COMMIT_MESSAGE="${GITHUB_COMMIT_MESSAGE:-Deploy: $(date +'%Y-%m-%d %H:%M:%S')}"
echo -e "${BLUE}💾 Commit oluşturuluyor...${NC}"
git commit -m "$COMMIT_MESSAGE" || {
    echo -e "${YELLOW}⚠️  Commit oluşturulamadı (muhtemelen değişiklik yok)${NC}"
}

# Push yap
echo -e "${BLUE}🚀 GitHub'a push yapılıyor...${NC}"
if git push origin "${CURRENT_BRANCH}"; then
    echo -e "${GREEN}✓ Push başarılı!${NC}"
    echo -e "${GREEN}✓ GitHub Actions otomatik deploy başlatılacak${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Push başarısız!${NC}"
    echo -e "${YELLOW}GitHub token kontrolü yapın veya SSH key ayarlarını kontrol edin.${NC}\n"
    exit 1
fi

