#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════╗
║  🛡️  VPS GUARDIAN INSTALLER        ║
║  Sistema Profissional de             ║
║  Monitoramento para VPS              ║
╚══════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}1. Criando diretórios...${NC}"
sudo mkdir -p /var/backups/vps-guardian
sudo chown -R $USER:$USER /var/backups/vps-guardian

echo -e "${BLUE}2. Configurando .env...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✅ .env criado${NC}"
fi

echo -e "${BLUE}3. Construindo containers...${NC}"
docker-compose build

echo -e "${BLUE}4. Iniciando serviços...${NC}"
docker-compose up -d

sleep 10

echo -e "${BLUE}5. Verificando status...${NC}"
docker-compose ps

echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════╗
║  ✅  INSTALAÇÃO CONCLUÍDA!          ║
║                                      ║
║  🌐 Dashboard: http://localhost:8080 │
║  🔌 API: http://localhost:3000/api   │
║                                      ║
║  Comandos úteis:                     ║
║  - Ver logs: docker-compose logs -f  │
║  - Parar: docker-compose stop        │
║  - Atualizar: git pull && make up   │
╚══════════════════════════════════════╝
EOF
echo -e "${NC}"
