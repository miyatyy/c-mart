FROM dunglas/frankenphp:php8.3-alpine

WORKDIR /app

# Salin konfigurasi Caddyfile & skrip worker.php
COPY Caddyfile /etc/caddy/Caddyfile
COPY worker.php /app/worker.php

EXPOSE 8000

ENV BACKEND_HOST=backend:5000

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
