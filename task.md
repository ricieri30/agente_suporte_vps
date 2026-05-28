# Tarefas: Otimização e Correções para Docker VPS

Acompanhamento de progresso das correções, melhorias aditivas e auditoria de produção do VPS Guardian:

- `[x]` 🛠️ Orquestração
  - `[x]` Alterar `/var/run/docker.sock` para read-write no `docker-compose.yml`
- `[x]` 💻 Backend (`server.js` e `backend/server.js`)
  - `[x]` Implementar persistência de configurações dinâmicas via `/app/config.json`
  - `[x]` Adicionar rotas `GET /api/settings` e `POST /api/settings`
  - `[x]` Adicionar checagem de limites (CPU, RAM, Disco) com emissão de alertas em memória
  - `[x]` Adicionar dispatch real de Webhooks (Slack/Discord) para alertas críticos e avisos
  - `[x]` Adicionar auto-restart ativo de containers com histórico e webhook
  - `[x]` Adicionar prune real de imagens/containers na limpeza de domingo
  - `[x]` Adicionar dependência `"nodemailer"` ao `backend/package.json`
  - `[x]` Adicionar novas chaves de settings dinâmicos (Telegram, SMTP, agendamento)
  - `[x]` Implementar envio de e-mails via SMTP com `nodemailer` em `sendEmailAlert()`
  - `[x]` Implementar alertas via Telegram em `sendTelegramAlert()`
  - `[x]` Desenvolver o reagendador dinâmico de cron de backup `scheduleBackupCron()`
  - `[x]` Atualizar a rota `/api/backups` POST e `runBackup()` para suportar as modalidades `full`, `logs`, `config` e `container`
- `[x]` 🎨 Frontend (React)
  - `[x]` Aprimorar `Settings.jsx` com carregamento, inputs premium e salvamento via API
  - `[x]` Aprimorar `Backups.jsx` com carregamento de tabela real, gatilho manual, restauração e exclusão
  - `[x]` Inserir no `Settings.jsx` o ajuste de horário do cron, e as abas/campos de ativação do Telegram e E-mail (SMTP)
  - `[x]` Inserir no `Backups.jsx` o seletor de tipo de backup (Full, Logs, Config, Container) e dropdown de seleção de containers
- `[x]` 🛡️ Auditoria de Produção e Segurança (Sem bugs ou erros)
  - `[x]` Mitigação de vulnerabilidades de Path Traversal e Command Injection nas rotas e motores de backup e restore via RegEx `/^[a-zA-Z0-9_-]+$/`
  - `[x]` Implementação de limite máximo de 3x auto-restart por container contra loop infinito
  - `[x]` Implementação de cooldown de 5 minutos entre tentativas de auto-restart para prevenir spam de alertas
  - `[x]` Escapamento dinâmico de caracteres especiais em HTML para envio estável de alertas via Telegram e Email
  - `[x]` Prevenção de divisões por zero ou valores NaN no parser de estatísticas do Docker (`parseStats`)
- `[x]` 🔄 Sincronização e Validação Final
  - `[x]` Sincronizar atualizações de `server.js` em arquivos internos e de distribuição
  - `[x]` Gerar pacotes finais compactados atualizados `vps-guardian-final.tar.gz` e `vps-guardian-final.zip`
