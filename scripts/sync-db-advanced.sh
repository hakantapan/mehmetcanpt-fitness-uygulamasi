#!/bin/bash

# Gelişmiş Veritabanı Senkronizasyon Scripti
# Yerel ve sunucu veritabanlarını senkronize eder
# Kullanım: ./scripts/sync-db-advanced.sh [direction]
# direction: local-to-server (varsayılan) veya server-to-local

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DIRECTION=${1:-local-to-server}

echo -e "${BLUE}🗄️  Gelişmiş Veritabanı Senkronizasyonu${NC}\n"

# .env.deploy dosyasını kontrol et
if [ ! -f .env.deploy ]; then
    echo -e "${RED}❌ .env.deploy dosyası bulunamadı!${NC}"
    exit 1
fi

source .env.deploy

# Yerel .env dosyasını kontrol et
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local dosyası bulunamadı, .env kullanılıyor...${NC}"
    ENV_FILE=".env"
else
    ENV_FILE=".env.local"
fi

# Yerel DATABASE_URL'i al
LOCAL_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$LOCAL_DB_URL" ]; then
    echo -e "${RED}❌ Yerel DATABASE_URL bulunamadı!${NC}"
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

# Sunucu DATABASE_URL'ini al
echo -e "${BLUE}📡 Sunucu bilgileri alınıyor...${NC}"
SERVER_DB_URL=$(${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '\"' | tr -d \"'\"" || echo "")

if [ -z "$SERVER_DB_URL" ]; then
    echo -e "${YELLOW}⚠️  Sunucu DATABASE_URL bulunamadı, docker-compose'den alınıyor...${NC}"
    SERVER_DB_URL=$(${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml exec -T postgres printenv DATABASE_URL 2>/dev/null || echo 'postgresql://postgres:postgres@postgres:5432/fitness_app'" || echo "")
fi

if [ "$DIRECTION" = "local-to-server" ]; then
    echo -e "${BLUE}📤 Yerel → Sunucu senkronizasyonu${NC}\n"
    
    # Yerel veritabanından dump al
    echo -e "${BLUE}1️⃣  Yerel veritabanından dump alınıyor...${NC}"
    DUMP_FILE="/tmp/fitness_db_$(date +%Y%m%d_%H%M%S).sql"
    
    # PostgreSQL connection string'den bilgileri parse et
    if [[ "$LOCAL_DB_URL" == *"postgresql://"* ]]; then
        # Prisma format: postgresql://user:password@host:port/database
        DB_INFO=$(echo "$LOCAL_DB_URL" | sed 's|postgresql://||' | sed 's|?.*||')
        DB_USER=$(echo "$DB_INFO" | cut -d':' -f1)
        DB_PASS=$(echo "$DB_INFO" | cut -d':' -f2 | cut -d'@' -f1)
        DB_HOST=$(echo "$DB_INFO" | cut -d'@' -f2 | cut -d':' -f1)
        DB_PORT=$(echo "$DB_INFO" | cut -d':' -f3 | cut -d'/' -f1)
        DB_NAME=$(echo "$DB_INFO" | cut -d'/' -f2)
        
        if [ -z "$DB_PORT" ]; then
            DB_PORT=5432
        fi
        
        export PGPASSWORD="$DB_PASS"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$DUMP_FILE"
        unset PGPASSWORD
    else
        echo -e "${RED}❌ Desteklenmeyen veritabanı formatı${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Dump alındı: $(du -h "$DUMP_FILE" | cut -f1)${NC}\n"
    
    # Dump'ı sunucuya gönder
    echo -e "${BLUE}2️⃣  Dump sunucuya gönderiliyor...${NC}"
    REMOTE_DUMP="/tmp/fitness_db_remote.sql"
    
    if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
        export SSHPASS="${DEPLOY_SSH_PASSWORD}"
        ${SSHPASS_CMD} -e scp -P ${DEPLOY_SSH_PORT:-22} "$DUMP_FILE" ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP}
    else
        if [ -n "${DEPLOY_SSH_KEY}" ]; then
            scp -i "${DEPLOY_SSH_KEY}" -P ${DEPLOY_SSH_PORT:-22} "$DUMP_FILE" ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP}
        else
            scp -P ${DEPLOY_SSH_PORT:-22} "$DUMP_FILE" ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP}
        fi
    fi
    
    echo -e "${GREEN}✓ Dump gönderildi${NC}\n"
    
    # Sunucuda restore et
    echo -e "${BLUE}3️⃣  Sunucuda veritabanı restore ediliyor...${NC}"
    ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} << EOF
        set -e
        cd "${DEPLOY_PATH}"
        
        # Docker container içinde restore
        if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
            echo "Docker container içinde restore ediliyor..."
            docker-compose -f docker-compose.prod.yml exec -T postgres psql -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-fitness_app} < ${REMOTE_DUMP}
        else
            echo "Standalone PostgreSQL'e restore ediliyor..."
            # Sunucu DATABASE_URL'den bilgileri parse et
            DB_URL="${SERVER_DB_URL}"
            DB_INFO=\$(echo "\$DB_URL" | sed 's|postgresql://||' | sed 's|?.*||')
            DB_USER=\$(echo "\$DB_INFO" | cut -d':' -f1)
            DB_PASS=\$(echo "\$DB_INFO" | cut -d':' -f2 | cut -d'@' -f1)
            DB_HOST=\$(echo "\$DB_INFO" | cut -d'@' -f2 | cut -d':' -f1)
            DB_PORT=\$(echo "\$DB_INFO" | cut -d':' -f3 | cut -d'/' -f1)
            DB_NAME=\$(echo "\$DB_INFO" | cut -d'/' -f2)
            
            if [ -z "\$DB_PORT" ]; then
                DB_PORT=5432
            fi
            
            export PGPASSWORD="\$DB_PASS"
            psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" < ${REMOTE_DUMP}
            unset PGPASSWORD
        fi
        
        # Dump dosyasını temizle
        rm -f ${REMOTE_DUMP}
        
        echo "✅ Veritabanı restore edildi"
EOF
    
    # Yerel dump dosyasını temizle
    rm -f "$DUMP_FILE"
    
    echo -e "\n${GREEN}✅ Veritabanı senkronizasyonu tamamlandı!${NC}"
    
elif [ "$DIRECTION" = "server-to-local" ]; then
    echo -e "${BLUE}📥 Sunucu → Yerel senkronizasyonu${NC}\n"
    
    echo -e "${YELLOW}⚠️  Bu işlem yerel veritabanınızı tamamen değiştirecek!${NC}"
    echo -e "${YELLOW}Devam edilsin mi? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
    
    # Sunucudan dump al
    echo -e "${BLUE}1️⃣  Sunucudan dump alınıyor...${NC}"
    REMOTE_DUMP="/tmp/fitness_db_server_$(date +%Y%m%d_%H%M%S).sql"
    LOCAL_DUMP="/tmp/fitness_db_local_$(date +%Y%m%d_%H%M%S).sql"
    
    ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} << EOF
        set -e
        cd ${DEPLOY_PATH}
        
        # Docker container içinden dump al
        if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
            echo "Docker container'dan dump alınıyor..."
            docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U \${POSTGRES_USER:-postgres} \${POSTGRES_DB:-fitness_app} --clean --if-exists > ${REMOTE_DUMP}
        else
            echo "Standalone PostgreSQL'den dump alınıyor..."
            DB_URL="${SERVER_DB_URL}"
            DB_INFO=\$(echo "\$DB_URL" | sed 's|postgresql://||' | sed 's|?.*||')
            DB_USER=\$(echo "\$DB_INFO" | cut -d':' -f1)
            DB_PASS=\$(echo "\$DB_INFO" | cut -d':' -f2 | cut -d'@' -f1)
            DB_HOST=\$(echo "\$DB_INFO" | cut -d'@' -f2 | cut -d':' -f1)
            DB_PORT=\$(echo "\$DB_INFO" | cut -d':' -f3 | cut -d'/' -f1)
            DB_NAME=\$(echo "\$DB_INFO" | cut -d'/' -f2)
            
            if [ -z "\$DB_PORT" ]; then
                DB_PORT=5432
            fi
            
            export PGPASSWORD="\$DB_PASS"
            pg_dump -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" --clean --if-exists > ${REMOTE_DUMP}
            unset PGPASSWORD
        fi
        
        echo "✅ Dump alındı"
EOF
    
    # Dump'ı yerel makineye indir
    echo -e "${BLUE}2️⃣  Dump yerel makineye indiriliyor...${NC}"
    if [ "${DEPLOY_USE_PASSWORD}" = "true" ] && [ -n "${DEPLOY_SSH_PASSWORD}" ]; then
        export SSHPASS="${DEPLOY_SSH_PASSWORD}"
        ${SSHPASS_CMD} -e scp -P ${DEPLOY_SSH_PORT:-22} ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP} "$LOCAL_DUMP"
    else
        if [ -n "${DEPLOY_SSH_KEY}" ]; then
            scp -i "${DEPLOY_SSH_KEY}" -P ${DEPLOY_SSH_PORT:-22} ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP} "$LOCAL_DUMP"
        else
            scp -P ${DEPLOY_SSH_PORT:-22} ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DUMP} "$LOCAL_DUMP"
        fi
    fi
    
    # Sunucudaki dump'ı temizle
    ${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST} "rm -f ${REMOTE_DUMP}"
    
    echo -e "${GREEN}✓ Dump indirildi: $(du -h "$LOCAL_DUMP" | cut -f1)${NC}\n"
    
    # Yerel veritabanına restore et
    echo -e "${BLUE}3️⃣  Yerel veritabanına restore ediliyor...${NC}"
    
    if [[ "$LOCAL_DB_URL" == *"postgresql://"* ]]; then
        DB_INFO=$(echo "$LOCAL_DB_URL" | sed 's|postgresql://||' | sed 's|?.*||')
        DB_USER=$(echo "$DB_INFO" | cut -d':' -f1)
        DB_PASS=$(echo "$DB_INFO" | cut -d':' -f2 | cut -d'@' -f1)
        DB_HOST=$(echo "$DB_INFO" | cut -d'@' -f2 | cut -d':' -f1)
        DB_PORT=$(echo "$DB_INFO" | cut -d':' -f3 | cut -d'/' -f1)
        DB_NAME=$(echo "$DB_INFO" | cut -d'/' -f2)
        
        if [ -z "$DB_PORT" ]; then
            DB_PORT=5432
        fi
        
        export PGPASSWORD="$DB_PASS"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$LOCAL_DUMP"
        unset PGPASSWORD
    fi
    
    # Yerel dump dosyasını temizle
    rm -f "$LOCAL_DUMP"
    
    echo -e "\n${GREEN}✅ Veritabanı senkronizasyonu tamamlandı!${NC}"
else
    echo -e "${RED}❌ Geçersiz direction: $DIRECTION${NC}"
    echo -e "${YELLOW}Kullanım: $0 [local-to-server|server-to-local]${NC}"
    exit 1
fi

