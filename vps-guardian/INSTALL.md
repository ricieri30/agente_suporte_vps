# 📖 Guia de Instalação

## Requisitos

- Ubuntu 20.04+ ou Debian 11+
- Docker 20.10+
- Docker Compose 2.0+
- 512MB RAM mínimo
- 2GB disco livre

## Instalação Automática

```bash
git clone https://github.com/seu-usuario/vps-guardian.git
cd vps-guardian
chmod +x install.sh
./install.sh
```

## Instalação Manual

```bash
git clone https://github.com/seu-usuario/vps-guardian.git
cd vps-guardian

# Configurar
cp .env.example .env
nano .env

# Executar
docker-compose up -d

# Verificar
docker-compose ps
```

## Configuração

Edite `.env` com suas preferências:

```env
MAX_BACKUPS=6              # Retenção de backups
WEBHOOK_ENABLED=true       # Ativar webhooks
WEBHOOK_URL=              # URL do webhook
CPU_THRESHOLD=90          # Threshold CPU
```

## Acesso

- **Dashboard**: http://seu-servidor:8080
- **API**: http://seu-servidor:3000/api

---

**Para usar o sistema, leia [USAGE.md](USAGE.md)** 📖
