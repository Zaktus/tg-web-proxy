.PHONY: gen up down restart logs secret

# Generate config.json, profiles.json, backend-config.py from templates/ and .env
gen:
	./generate-configs.sh

# Build and start everything (configs are regenerated first)
up: gen
	docker compose up -d --build
	@set -a; . ./.env; set +a; \
	printf '\n\033[1;32m============================================================\033[0m\n'; \
	printf '\033[1;32m  WEB proxy is up:\033[0m\n'; \
	printf '\033[1;36m  tg://webproxy?server=$$PUBLIC_HOSTNAME&secret=$$MT_SECRET\033[0m\n'; \
	printf '\033[1;32m============================================================\033[0m\n'

down:
	docker compose down

# Restart only the relay (required after editing anything in site/, which is
# read once at startup)
restart:
	docker compose restart tproxy-server

logs:
	docker compose logs -f tproxy-server mtproxy

# Print a new client-facing secret
secret:
	openssl rand -hex 16