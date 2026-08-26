FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git
WORKDIR /build

# Клонируем исходный код upstream и закрепляем на известном коммите.
# В upstream нет тегов/релизов, поэтому воспроизводимость сборки
# обеспечивается фиксацией конкретного коммита.
RUN git clone https://github.com/telegramdesktop/tproxy-server.git . && \
    git checkout 52a5feb7fac38f68da5afef9cedd9b3bfc8473ca && \
    go mod download && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o tproxy-server ./cmd/tproxy-server

FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /build/tproxy-server /app/tproxy-server

# Фактические слушатели (см. README): 8090 - релейный WEB, 8091 - админка.
EXPOSE 8090 8091
ENTRYPOINT ["/app/tproxy-server"]
CMD ["-config", "/app/config.json", "-profiles-file", "/app/profiles.json"]