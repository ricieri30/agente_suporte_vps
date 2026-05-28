# Walkthrough: VPS Guardian Otimizado e Seguro para Produção

O projeto foi revisado e refatorado com foco em segurança, estabilidade e conformidade com as especificações antes do deploy final em produção.

---

## 🛠️ O que foi resolvido e aprimorado

### 1. Correções Críticas de Segurança (Mitigação de Vulnerabilidades)
- **Sanitização de Parâmetros e Prevenção de Path Traversal / Command Injection**:
  - Nas rotas de exclusão e restauração de backups (`DELETE /api/backups/:id` e `POST /api/backups/:id/restore`), o parâmetro `:id` agora é validado com a expressão regular `/^[a-zA-Z0-9_-]+$/`. Isso impede a execução de comandos maliciosos injetados e a navegação não autorizada por diretórios do sistema (Directory Traversal).
  - No motor de backups (`runBackup`), os argumentos `type` e `containerId` são estritamente sanitizados e validados contra uma lista de valores permitidos (`['full', 'logs', 'config', 'container']`) e padrões alfanuméricos, eliminando riscos de injeção de comandos bash através do utilitário `tar`.

### 2. Estabilidade e Tratamento de Loops (Auto-Restart Limit & Cooldown)
- **Prevenção de Loops de Crash e Spam de Alertas**:
  - Implementou-se um rastreador em memória (`restartTracker`) para monitorar o auto-restart de containers.
  - **Limite de Tentativas**: O sistema agora realiza no máximo 3 tentativas de reinício automático para um mesmo container.
  - **Alerta Permanente**: Caso o container continue inativo após a 3ª tentativa, o auto-restart é interrompido e um alerta crítico consolidado é emitido para notificar falha permanente.
  - **Cooldown de 5 Minutos**: As tentativas de reinício são espaçadas por um intervalo mínimo de 5 minutos, evitando sobrecarga na CPU e spam de notificações (e-mails ou mensagens em Telegram/Slack).
  - **Reset de Rastreador**: Se o container funcionar de forma estável por mais de 10 minutos, o contador de restarts associado é limpo.

### 3. Conectividade e Robustez nas Notificações (Telegram e SMTP)
- **Correção no Parsing do Telegram**:
  - O formato de envio do Telegram foi alterado de `Markdown` para `HTML` estruturado. Toda mensagem e título são devidamente escapados através da nova função utilitária `escapeHtml`. Isso corrige um erro crônico da API do Telegram que falha em enviar mensagens se houver caracteres especiais não escapados (como underscores `_` em nomes de containers como `my_database_container`).
- **SMTP Flexível**:
  - O transporte SMTP do `nodemailer` foi flexibilizado para suportar servidores que operam sem autenticação (como relays internos e hosts locais de teste), omitindo a chave `auth` caso o usuário SMTP não esteja configurado no painel.

### 4. Robustez do Motor de Métricas
- **Prevenção de Divisão por Zero e Valores NaN**:
  - A função `parseStats` que realiza o parse de métricas em tempo real enviadas pela API do Docker agora monitora se `systemDelta` ou `cpuDelta` são zerados ou inválidos.
  - Valores resultantes de divisão por zero ou não numéricos são convertidos automaticamente para zero, garantindo que o gráfico individual do container nunca renderize erros ou sofra interrupções.

### 5. Distribuição e Backup Final
- Gerados pacotes finais e atualizados contendo todos os arquivos sanitizados e otimizados:
  - Tarball: [vps-guardian-final.tar.gz](file:///c:/Users/Rici/Documents/Files%20RM/Suporte%20de%20aplicacao/vps-guardian-final.tar.gz)
  - Zip: [vps-guardian-final.zip](file:///c:/Users/Rici/Documents/Files%20RM/Suporte%20de%20aplicacao/vps-guardian-final.zip)

---

## 🔬 Arquitetura de Fluxo de Dados e Segurança

```
[Cliente Frontend] <== (Sanitizado / HTTP) ==> [Express API]
                                                  |
           +-- Parâmetros Validados (RegEx) ------+-- (config.json)
           +-- Limites de Restart & Cooldown -----+-- [Rastreador de Auto-Restart]
           +-- Textos Escapados (HTML) -----------+-- [Notificações: Telegram/Email/Slack]
           +-- Chamada tar Sanitizada ------------+-- [Volume Físico de Backups]
```

As modificações fornecem conformidade técnica, segurança reforçada e controle de estabilidade para uso confiável em ambientes de produção.
