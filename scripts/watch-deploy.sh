#!/bin/bash

# Otomatik Deploy Watch Scripti
# Dosya değişikliklerini izler ve otomatik deploy eder
# Kullanım: ./scripts/watch-deploy.sh

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}👀 Watch modu başlatılıyor...${NC}"
echo -e "${YELLOW}Dosya değişiklikleri otomatik olarak sunucuya deploy edilecek.${NC}"
echo -e "${YELLOW}Çıkmak için Ctrl+C tuşlarına basın.${NC}\n"

# .env.deploy dosyasını kontrol et
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    exit 1
fi

source .env.deploy

# Deploy scriptini belirle
DEPLOY_SCRIPT="./scripts/deploy-docker.sh"
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    DEPLOY_SCRIPT="./scripts/deploy.sh"
fi

# Deploy gecikmesi (saniye) - çoklu değişikliklerde tek deploy için
DEPLOY_DELAY=${WATCH_DEPLOY_DELAY:-5}

# Son deploy zamanı
LAST_DEPLOY=0

# Deploy fonksiyonu
deploy() {
    local current_time=$(date +%s)
    local time_since_last=$((current_time - LAST_DEPLOY))
    
    # Eğer son deploy'dan bu yana yeterli zaman geçmediyse bekle
    if [ $time_since_last -lt $DEPLOY_DELAY ]; then
        local wait_time=$((DEPLOY_DELAY - time_since_last))
        echo -e "${YELLOW}⏳ ${wait_time} saniye bekleniyor (çoklu değişiklikler için)...${NC}"
        sleep $wait_time
    fi
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔄 Değişiklik tespit edildi - Deploy başlatılıyor...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    LAST_DEPLOY=$(date +%s)
    
    # Deploy scriptini çalıştır
    if bash "$DEPLOY_SCRIPT"; then
        echo -e "\n${GREEN}✅ Deploy başarılı!${NC}"
        echo -e "${BLUE}👀 Değişiklikler izlenmeye devam ediliyor...\n${NC}"
    else
        echo -e "\n${RED}❌ Deploy başarısız!${NC}"
        echo -e "${YELLOW}👀 Değişiklikler izlenmeye devam ediliyor...\n${NC}"
    fi
}

# İzlenecek dosya/dizinler
WATCH_PATTERNS=(
    "app/**/*.tsx"
    "app/**/*.ts"
    "components/**/*.tsx"
    "components/**/*.ts"
    "lib/**/*.ts"
    "prisma/**/*.prisma"
    "*.json"
    "*.js"
    "*.mjs"
    "*.ts"
)

# İzlenmeyecek dosya/dizinler
IGNORE_PATTERNS=(
    "node_modules"
    ".next"
    ".git"
    "*.log"
    ".DS_Store"
    "backups"
)

# fswatch kontrolü (macOS)
if command -v fswatch &> /dev/null; then
    echo -e "${GREEN}✓ fswatch bulundu (macOS)${NC}\n"
    
    # İzleme komutunu oluştur
    IGNORE_ARGS=""
    for pattern in "${IGNORE_PATTERNS[@]}"; do
        IGNORE_ARGS="$IGNORE_ARGS -e '$pattern'"
    done
    
    # fswatch ile izle
    eval "fswatch -r -o . $IGNORE_ARGS" | while read f; do
        deploy
    done

# inotifywait kontrolü (Linux)
elif command -v inotifywait &> /dev/null; then
    echo -e "${GREEN}✓ inotifywait bulundu (Linux)${NC}\n"
    
    # İzleme dizinleri
    WATCH_DIRS="app components lib prisma"
    
    while true; do
        inotifywait -r -e modify,create,delete,move \
            --exclude 'node_modules|\.next|\.git|\.log|\.DS_Store|backups' \
            $WATCH_DIRS . 2>/dev/null || true
        
        deploy
    done

# chokidar-cli kontrolü (npm paketi)
elif command -v chokidar &> /dev/null || [ -f "node_modules/.bin/chokidar" ]; then
    echo -e "${GREEN}✓ chokidar bulundu${NC}\n"
    
    CHOKIDAR_CMD="node_modules/.bin/chokidar"
    if command -v chokidar &> /dev/null; then
        CHOKIDAR_CMD="chokidar"
    fi
    
    IGNORE_ARGS=""
    for pattern in "${IGNORE_PATTERNS[@]}"; do
        IGNORE_ARGS="$IGNORE_ARGS --ignore '$pattern'"
    done
    
    eval "$CHOKIDAR_CMD '**/*.{ts,tsx,js,jsx,json,prisma}' $IGNORE_ARGS -c 'bash -c \"deploy\"'"

# Hiçbiri yoksa uyarı ver
else
    echo -e "${RED}❌ Dosya izleme aracı bulunamadı!${NC}"
    echo -e "${YELLOW}Lütfen şunlardan birini kurun:${NC}"
    echo -e "  - macOS: brew install fswatch"
    echo -e "  - Linux: apt-get install inotify-tools"
    echo -e "  - npm: npm install -g chokidar-cli"
    exit 1
fi

