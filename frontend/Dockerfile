# Multi-stage build for CodeLab Frontend SPA (ARM64 & x86_64)
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
    root * /var/www/html
    try_files {path} /index.html
    file_server
    encode gzip
}
EOF

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]

