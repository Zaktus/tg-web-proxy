.PHONY: gen up down restart logs secret

# Generate config.json, profiles.json, backend-config.py from templates/ and .env
gen:
	./generate-configs.sh

# Build and start everything (configs are regenerated first)
up: gen
	docker compose up -d --build

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