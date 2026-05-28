# 🚀 Deploy — GitHub + Docker

Projeto validado: backend sobe, frontend compila (`npm run build` OK), git já com commit na branch `main`.

## 1. Subir no GitHub

O repositório já está inicializado e com commit feito. Extraia o pacote e aponte para o SEU repositório:

```bash
# extraia o pacote (já contém a pasta .git com o commit pronto)
tar -xzf vps-guardian-pronto-github.tar.gz
cd vps-guardian

# crie um repo vazio em https://github.com/new (nome: vps-guardian)
# NÃO marque "Add README/.gitignore/license" — já temos

# conecte e envie
git remote add origin https://github.com/SEU-USUARIO/vps-guardian.git
git push -u origin main
```

Se o GitHub pedir autenticação, use um Personal Access Token como senha
(Settings → Developer settings → Personal access tokens).

## 2. Rodar no VPS com Docker

No servidor (`ssh root@76.13.236.166`):

```bash
git clone https://github.com/SEU-USUARIO/vps-guardian.git
cd vps-guardian

cp .env.example .env      # ajuste webhooks/limites se quiser
docker compose up -d --build
```

- Dashboard: `http://76.13.236.166:8080`
- A API fica interna; o frontend acessa via proxy `/api` do nginx.
  Só a porta 8080 precisa estar aberta (a 3000 é opcional).

## 3. Verificar

```bash
docker compose ps                          # ambos "healthy"
docker compose logs -f vps-guardian-backend # deve logar "Docker conectado"
curl http://localhost:8080/api/metrics/system   # JSON com cpu/memory/disk
```

Os gráficos começam vazios e preenchem a cada 30s (intervalo de coleta).

## Notas técnicas (o que foi corrigido)

- Paleta Tailwind completa (`dark-100`..`dark-950`) — sem isso o build do
  frontend quebrava.
- `npm ci` com `package-lock.json` nos dois serviços → builds reprodutíveis.
- Disco do host montado em `/rootfs:ro` para métrica real do VPS.
- `sqlite3` removido (não usado) — build muito mais rápido.
- `.dockerignore` em ambos os serviços; `.env` fora do git.

## Atualizar depois

```bash
git pull
docker compose up -d --build
```
