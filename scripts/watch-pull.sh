#!/bin/bash

# Production'dan Otomatik Veri Çekme Watch Scripti
# Belirli aralıklarla production'dan veri çeker
# Kullanım: ./scripts/watch-pull.sh [interval_seconds]

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Varsayılan interval (saniye)
INTERVAL=${1:-300}  # 5 dakika varsayılan

echo -e "${BLUE}👀 Production'dan otomatik veri çekme modu başlatılıyor...${NC}"
echo -e "${YELLOW}Her ${INTERVAL} saniyede bir production'dan veri çekilecek.${NC}"
echo -e "${YELLOW}Çıkmak için Ctrl+C tuşlarına basın.${NC}\n"

# .env.deploy kontrolü
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    exit 1
fi

source .env.deploy

# Pull scriptini çalıştır
pull_data() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔄 Production'dan veri çekiliyor... (${INTERVAL}s aralık)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    AUTO_CONFIRM=true bash scripts/pull-from-production.sh all
    
    echo -e "\n${GREEN}✅ Veri çekme tamamlandı. ${INTERVAL} saniye sonra tekrar denenecek...${NC}\n"
}

# İlk çekme
pull_data

# Döngü
while true; do
    sleep $INTERVAL
    pull_data
done

