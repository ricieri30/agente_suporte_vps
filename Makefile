.PHONY: up down logs build install clean

install:
	chmod +x install.sh
	./install.sh

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

build:
	docker-compose build

restart:
	docker-compose restart

clean:
	docker-compose down -v
	rm -rf backend/logs/* frontend/dist/*

ps:
	docker-compose ps

backend-logs:
	docker-compose logs -f vps-guardian-backend

frontend-logs:
	docker-compose logs -f vps-guardian-frontend

shell-backend:
	docker-compose exec vps-guardian-backend sh

help:
	@echo "VPS Guardian - Comandos disponíveis:"
	@echo "  make install      - Instalar projeto"
	@echo "  make up          - Iniciar serviços"
	@echo "  make down        - Parar serviços"
	@echo "  make logs        - Ver logs"
	@echo "  make restart     - Reiniciar"
	@echo "  make build       - Build containers"
	@echo "  make ps          - Status dos containers"
