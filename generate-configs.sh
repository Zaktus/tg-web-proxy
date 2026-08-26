#!/bin/sh
# Generates config.json, profiles.json and backend-config.py from templates/
# using a single source of truth: the .env file (or exported environment).
#
# Usage: ./generate-configs.sh
set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Load .env if present (values from the exported environment take precedence).
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

# Required values.
: "${PUBLIC_HOSTNAME:?PUBLIC_HOSTNAME is required (see .env.example)}"
: "${MT_SECRET:?MT_SECRET is required (see .env.example)}"

# Optional values with defaults.
TLS_DOMAIN="${TLS_DOMAIN:-$PUBLIC_HOSTNAME}"
RELAY_LISTEN="${RELAY_LISTEN:-127.0.0.1:8090}"
ADMIN_LISTEN="${ADMIN_LISTEN:-127.0.0.1:8091}"
MT_BACKEND="${MT_BACKEND:-127.0.0.1:8443}"
MT_CARRIER_MODE="${MT_CARRIER_MODE:-https}"
MT_PROFILE_NAME="${MT_PROFILE_NAME:-default}"
MT_PORT="${MT_BACKEND##*:}"

# Validate the secret: 32 lowercase hex characters.
if ! printf '%s' "$MT_SECRET" | grep -Eq '^[0-9a-f]{32}$'; then
    echo "Error: MT_SECRET must be 32 lowercase hex characters (use: openssl rand -hex 16)" >&2
    exit 1
fi

# Refuse to generate with the documented example secret.
if [ "$MT_SECRET" = "000102030405060708090a0b0c0d0e0f" ]; then
    echo "Error: MT_SECRET still holds the example value from .env.example" >&2
    echo "Generate a real secret with: openssl rand -hex 16" >&2
    exit 1
fi

render() {
    sed \
        -e "s|__PUBLIC_HOSTNAME__|$PUBLIC_HOSTNAME|g" \
        -e "s|__MT_SECRET__|$MT_SECRET|g" \
        -e "s|__TLS_DOMAIN__|$TLS_DOMAIN|g" \
        -e "s|__RELAY_LISTEN__|$RELAY_LISTEN|g" \
        -e "s|__ADMIN_LISTEN__|$ADMIN_LISTEN|g" \
        -e "s|__MT_BACKEND__|$MT_BACKEND|g" \
        -e "s|__MT_PORT__|$MT_PORT|g" \
        -e "s|__MT_CARRIER_MODE__|$MT_CARRIER_MODE|g" \
        -e "s|__MT_PROFILE_NAME__|$MT_PROFILE_NAME|g" \
        "$1"
}

# Write a rendered template to its destination via a temp file, so a previous
# run with restrictive modes (e.g. chmod 0400 on profiles.json) never blocks a
# re-run of this script.
write_file() {
    tpl="$1"
    out="$2"
    mode="$3"

    render "$tpl" > "$out.tmp"
    chmod "$mode" "$out.tmp"
    mv -f "$out.tmp" "$out"
}

write_file templates/config.json.tpl config.json 0600
write_file templates/profiles.json.tpl profiles.json 0400
write_file templates/backend-config.py.tpl backend-config.py 0600

echo "Generated config.json, profiles.json, backend-config.py"