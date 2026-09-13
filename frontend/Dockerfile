# Multi-stage build for Benigascode Frontend SPA (ARM64 & x86_64)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production serve stage using Caddy lightweight
FROM caddy:2.8-alpine
WORKDIR /var/www/html
COPY --from=builder /app/dist /var/www/html
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
