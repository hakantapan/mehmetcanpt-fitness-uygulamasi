#!/bin/bash

# Sunucu İlk Kurulum Scripti
# Bu scripti sunucuda bir kez çalıştırın
# Kullanım: ssh user@server 'bash -s' < scripts/setup-server.sh

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Sunucu kurulumu başlatılıyor...${NC}\n"

# Docker kontrolü ve kurulumu
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Docker kuruluyor...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker kuruldu${NC}"
else
    echo -e "${GREEN}✓ Docker zaten kurulu${NC}"
fi

# Docker Compose kontrolü ve kurulumu
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 Docker Compose kuruluyor...${NC}"
    # Docker Compose V2 (docker compose) genellikle Docker ile birlikte gelir
    # Eğer yoksa V1'i kur
    if ! docker compose version &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    echo -e "${GREEN}✓ Docker Compose kuruldu${NC}"
else
    echo -e "${GREEN}✓ Docker Compose zaten kurulu${NC}"
fi

# Docker servisini başlat
echo -e "${YELLOW}🚀 Docker servisi başlatılıyor...${NC}"
sudo systemctl start docker || true
sudo systemctl enable docker || true

# Kullanıcıyı docker grubuna ekle (sudo gerektirmeden docker kullanmak için)
if ! groups | grep -q docker; then
    echo -e "${YELLOW}👤 Kullanıcı docker grubuna ekleniyor...${NC}"
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Kullanıcı docker grubuna eklendi${NC}"
    echo -e "${YELLOW}⚠️  Değişikliklerin etkili olması için oturumu kapatıp tekrar açmanız gerekebilir.${NC}"
fi

# Gerekli dizinleri oluştur
echo -e "${YELLOW}📁 Dizinler oluşturuluyor...${NC}"
mkdir -p backups
mkdir -p public/uploads/avatars
mkdir -p public/uploads/trainers
echo -e "${GREEN}✓ Dizinler oluşturuldu${NC}"

echo -e "\n${GREEN}✅ Sunucu kurulumu tamamlandı!${NC}"
echo -e "${BLUE}📝 Sonraki adımlar:${NC}"
echo -e "  1. .env.deploy dosyasını yerel makinenizde oluşturun"
echo -e "  2. npm run deploy:docker komutu ile deploy yapın"
echo -e "  3. Sunucuda .env dosyasını oluşturun (production environment variables)"

