# Multi-stage build for Benigascode Frontend SPA (ARM64 & x86_64)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production serve stage using Caddy lightweight
FROM caddy:2.8-alpine
COPY --from=builder /app/dist /var/www/html
COPY <<EOF /etc/caddy/Caddyfile
:80 {
    # Assets estáticos con hash inmutables
    @assets {
        path /assets/*
    }
    header @assets Cache-Control "public, max-age=31536000, immutable"

    # Rutas SPA y HTML nunca deben cachearse en el navegador
    @notAssets {
        not path /assets/*
    }
    header @notAssets Cache-Control "no-cache, no-store, must-revalidate"
    header @notAssets Pragma "no-cache"

    # API Backend Reverse Proxy
    handle /api/* {
        reverse_proxy backend:8080 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Health check
    handle /actuator/health {
        reverse_proxy backend:8080
    }

    # Frontend SPA
    handle {
        root * /var/www/html
        try_files {path} /index.html
        file_server
    }

    encode gzip
}
EOF

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]

