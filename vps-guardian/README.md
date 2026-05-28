# 🛡️ VPS Guardian

<div align="center">

**Sistema Profissional de Monitoramento, Backup e Manutenção de Containers Docker**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [📖 Docs](#-documentation) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 O que é VPS Guardian?

VPS Guardian é um sistema completo, profissional e pronto para produção que monitora, faz backup automático e mantém seus containers Docker 24/7. Com uma interface premium, alertas inteligentes e automação completa, você pode dormir tranquilo sabendo que seus servidores estão sendo cuidados.

### ⚡ Por que escolher VPS Guardian?

- 🔄 **Restart Automático** - Detecta e reinicia containers que caem em segundos
- 💾 **Backups Inteligentes** - Backup automático diário (01:00) com retenção de 6
- 📊 **Dashboard Premium** - Interface moderna, responsiva e intuitiva
- 🔔 **Alertas Proativos** - Slack, Discord, Telegram com 3 níveis de severidade
- 🏥 **Health Checks** - HTTP/TCP/Command customizável para cada container
- 🧹 **Limpeza Automática** - Remove containers órfãos, imagens e volumes
- 📱 **100% Responsivo** - Mobile, tablet, desktop - funciona em tudo

---

## 🚀 Quick Start

### Option 1: Instalador Automático (Recomendado)

```bash
git clone https://github.com/seu-usuario/vps-guardian.git
cd vps-guardian
chmod +x install.sh
./install.sh
```

Pronto! Acesse: **http://seu-servidor:8080**

### Option 2: Docker Compose Manual

```bash
git clone https://github.com/seu-usuario/vps-guardian.git
cd vps-guardian

cp .env.example .env
docker-compose up -d

# Acesse: http://localhost:8080
# API: http://localhost:3000
```

---

## ✨ Features Completas

### 1️⃣ Monitoramento em Tempo Real
- ✅ Status de todos os containers
- ✅ Métricas CPU, RAM, Disco, Rede
- ✅ Atualização a cada 30 segundos
- ✅ Alertas automáticos de problemas
- ✅ Histórico de métricas

### 2️⃣ Backup Inteligente
- ✅ Automático diário (01:00 da manhã)
- ✅ Retenção de 6 backups
- ✅ Backup de volumes, configs, BD
- ✅ Compressão automática
- ✅ Restauração rápida com 1 clique

### 3️⃣ Restart Automático
- ✅ Detecta containers que caem
- ✅ Reinicia automaticamente (até 3x)
- ✅ Alerta se falhar permanentemente
- ✅ Histórico de tentativas
- ✅ Limite de 5 minutos entre tentativas

### 4️⃣ Health Checks
- ✅ HTTP checks com validação de status
- ✅ TCP checks para portas
- ✅ Custom commands dentro do container
- ✅ Configuração via interface
- ✅ Histórico dos últimos 100 checks

### 5️⃣ Dashboard Premium
- ✅ 4 cards de estatísticas
- ✅ Gráficos interativos Recharts
- ✅ Grid de containers responsivo
- ✅ Modal de logs com syntax highlighting
- ✅ Gerenciamento de backups
- ✅ Configurações avançadas
- ✅ Dark theme moderno

### 6️⃣ Alertas Inteligentes
- ✅ Slack, Discord, Telegram
- ✅ 3 níveis: Info, Warning, Critical
- ✅ Webhooks customizáveis
- ✅ Testes de alertas
- ✅ Histórico de alertas

### 7️⃣ Limpeza Automática
- ✅ Remove containers órfãos (semanal)
- ✅ Remove imagens não utilizadas
- ✅ Limpa volumes órfãos
- ✅ Otimiza logs do Docker
- ✅ Libera espaço automaticamente

---

## 🛠️ Stack Tecnológico

### Backend
```
Node.js 18 + Express
├── Dockerode (API Docker)
├── Winston (Logging profissional)
├── node-cron (Scheduling automático)
├── systeminformation (Métricas)
└── axios (HTTP client)
```

### Frontend
```
React 18 + Vite + Tailwind CSS
├── Recharts (Gráficos interativos)
├── Lucide React (Ícones modernos)
├── React Router (SPA routing)
├── React Hot Toast (Notificações)
└── Axios (HTTP client)
```

### DevOps
```
Docker + Docker Compose
├── Nginx (Frontend)
├── Node.js Alpine (Backend)
└── Volumes para persistência
```

---

## 📋 Requisitos

- **OS**: Ubuntu 20.04+ ou Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: 512MB mínimo
- **Disco**: 2GB livre

---

## 📖 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [QUICKSTART.md](QUICKSTART.md) | Comece em 5 minutos |
| [INSTALL.md](INSTALL.md) | Guia de instalação completo |
| [USAGE.md](USAGE.md) | Como usar todas as features |
| [TESTING.md](TESTING.md) | Guia de testes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir |
| [API.md](API.md) | Documentação da API REST |

---

## 🎨 Screenshots

### Dashboard
Interface moderna com métricas em tempo real, gráficos interativos e alertas.

### Containers
Grid responsivo com filtros, controles rápidos e visualização de logs.

### Backups
Criação, restauração e gerenciamento de backups com interface intuitiva.

---

## 📊 Uso de Recursos

```
Overhead do VPS Guardian:
├── CPU: 2-5% adicional
├── RAM: 150-200MB
└── Disco: 500MB + backups variáveis
```

---

## 🔧 Comandos Úteis

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Logs apenas do backend
docker-compose logs -f vps-guardian-backend

# Reiniciar tudo
docker-compose restart

# Parar serviços
docker-compose stop

# Atualizar projeto
git pull && docker-compose up -d

# Entrar no backend
docker-compose exec vps-guardian-backend sh

# Limpar dados (cuidado!)
docker-compose down -v
```

---

## 🤝 Contribuindo

Queremos sua contribuição! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

```bash
# 1. Fork o projeto
# 2. Clone seu fork
git clone https://github.com/seu-usuario/vps-guardian.git
cd vps-guardian

# 3. Crie uma branch
git checkout -b feature/sua-feature

# 4. Commit e push
git commit -m "feat: descrição da feature"
git push origin feature/sua-feature

# 5. Abra um Pull Request
```

---

## 📝 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes completos.

---

## 📞 Suporte

- 📖 **Documentação**: Veja os arquivos .md do projeto
- 🐛 **Issues**: [GitHub Issues](https://github.com/seu-usuario/vps-guardian/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/vps-guardian/discussions)
- 📧 **Email**: support@vps-guardian.com

---

## 🙏 Agradecimentos

- [Docker](https://www.docker.com/) - Containerização
- [React](https://reactjs.org/) - Framework UI
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Recharts](https://recharts.org/) - Biblioteca de gráficos
- [Node.js](https://nodejs.org/) - Runtime JavaScript

---

## 🚀 Roadmap

- [ ] Integração com Prometheus
- [ ] Suporte a Kubernetes
- [ ] Mobile app nativa
- [ ] Autenticação com OAuth2
- [ ] Suporte a múltiplos servidores
- [ ] API GraphQL
- [ ] Backup criptografado
- [ ] Dashboard customizável

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade DevOps**

Se este projeto foi útil, por favor deixe uma ⭐ no GitHub!

[⬆ Voltar ao topo](#-vps-guardian)

</div>
