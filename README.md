# tg-web-proxy

Docker-развёртывание Telegram **WEB proxy** для одного домена: Go-релей (`tproxy-server`), MTProto-бэкенд и статический сайт-заглушка.

Это операторская обвязка вокруг [telegramdesktop/tproxy-server](https://github.com/telegramdesktop/tproxy-server). Секреты и домен не захардкожены — конфиги генерируются из `.env`, поэтому проект безопасно держать в открытом доступе.

## Как это работает

```
Telegram app
  |  MTProto-соединения с обычным MTProxy-преобразованием
  v
локальный WEB proxy адаптер (в клиенте)
  |  один WebView-транспорт и аутентифицированная сессия
  v
Internet :443  ->  reverse proxy (TLS)  ->  127.0.0.1:8090  tproxy-server  ->  127.0.0.1:8443  MTProxy
                    (Caddy/nginx)                                  |                          |
                                                                   +--> site/ (публичный сайт)  +
```

TLS-терминация выполняется внешним reverse proxy: он маппит `proxy.example.com:443` → `127.0.0.1:8090`. Сам релей слушает только loopback. Только запрос с корректным bridge-параметром открывает страницу моста; всё остальное — публичный сайт.

## Требования

- x86_64 Linux с `docker` и `docker compose`
- Публичный IP и DNS-запись `A` на домен
- Внешний reverse proxy с TLS (Caddy или nginx, примеры — в `examples/`)

## Быстрый старт

```bash
cp .env.example .env
```

Заполните `.env`:

```bash
PUBLIC_HOSTNAME=proxy.example.com
MT_SECRET=000102030405060708090a0b0c0d0e0f   # сгенерируйте свой: openssl rand -hex 16
```

Затем:

```bash
make up
```

`make up` сначала генерирует `config.json`, `profiles.json` и `backend-config.py` из шаблонов в `templates/` (единый источник секрета — `.env`), затем собирает и запускает контейнеры.

Проверка:

```bash
curl -fsS http://127.0.0.1:8091/healthz    # релей жив
curl -fsS http://127.0.0.1:8091/readyz     # релей + бэкенд готовы
curl -fsS http://127.0.0.1:8091/metrics    # метрики
```

## Настройка reverse proxy (TLS)

Готовые конфиги: [`examples/Caddyfile`](examples/Caddyfile), [`examples/nginx.conf`](examples/nginx.conf). Релей должен получать оригинальный `Host`. Не включайте логирование сырых URI и заголовков — bridge-URL несёт производную capability.

## Настройка клиента Telegram

Клиенту, поддерживающему WEB proxy, нужны два значения:

```
Hostname: proxy.example.com
Secret:   000102030405060708090a0b0c0d0e0f
```

Готовая ссылка для подключения:

```
https://t.me/webproxy?server=proxy.example.com&secret=000102030405060708090a0b0c0d0e0f
```

## Порты (host network, только loopback)

| Порт | Слушатель |
|---|---|
| `127.0.0.1:8090` | релей WEB (`config.json` `listen`) |
| `127.0.0.1:8091` | релей админка (`admin_listen`; healthz/readyz/metrics) |
| `127.0.0.1:8443` | MTProto-бэкенд (`backend-config.py` `PORT`), куда ходит `profiles.json` `backend` |

## Переменные окружения (`.env`)

| Переменная | Обязательна | Дефолт | Описание |
|---|---|---|---|
| `PUBLIC_HOSTNAME` | да | — | публичный домен прокси |
| `MT_SECRET` | да | — | клиентский секрет, 32 hex (см. `openssl rand -hex 16`) |
| `TLS_DOMAIN` | нет | `PUBLIC_HOSTNAME` | fake-TLS домен для бэкенда |
| `RELAY_LISTEN` | нет | `127.0.0.1:8090` | адрес релея |
| `ADMIN_LISTEN` | нет | `127.0.0.1:8091` | адрес админки |
| `MT_BACKEND` | нет | `127.0.0.1:8443` | адрес бэкенда (порт выводится автоматически) |
| `MT_CARRIER_MODE` | нет | `https` | режим: `https` \| `https-lanes` \| `websocket` \| `websocket-lanes` |
| `MT_PROFILE_NAME` | нет | `default` | имя профиля / пользователя бэкенда |

Секрет автоматически попадает и в `profiles.json`, и в `backend-config.py` — рассинхронизировать невозможно.

## Команды

```bash
make gen       # сгенерировать конфиги из .env
make up        # gen + docker compose up -d --build
make restart   # перезапустить только релей
make logs      # логи tproxy-server и mtproxy
make secret    # сгенерировать новый секрет
```

## Готики

- Релей читает `public_dir` **один раз при старте** (статически, в память). После правок в `site/` запускайте `make restart`, иначе изменения не появятся.
- Админка (`:8091`) и бэкенд (`:8443`) должны оставаться loopback-only.
- Не логируйте bridge-URL и заголовки авторизации (они несут производную capability).
- `profiles.json` монтируется read-only и генерируется с `chmod 0400` (требование upstream).
- В `Dockerfile` клонируется и собирается upstream `tproxy-server` — версия закреплена на конкретном коммите. Чтобы обновиться, смените хеш в `Dockerfile` и соберите заново.

## Структура

```
.
├── templates/            # шаблоны конфигов (config.json, profiles.json, backend-config.py)
├── generate-configs.sh   # генератор конфигов из .env
├── site/                 # статический сайт-заглушка (логотип = location.hostname)
├── examples/             # Caddyfile и nginx.conf для TLS-терминации
├── Dockerfile            # сборка tproxy-server (пин коммита upstream)
├── docker-compose.yml    # tproxy-server + mtproxy (host network, healthcheck)
└── .env.example          # образец переменных окружения
```

## Лицензия

[MIT](LICENSE). Upstream-код: [telegramdesktop/tproxy-server](https://github.com/telegramdesktop/tproxy-server).