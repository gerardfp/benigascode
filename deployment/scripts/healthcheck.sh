#!/bin/bash
set -euo pipefail

# Benigascode Health Check Script
echo "=== Estado de los contenedores Docker ==="
docker compose -f deployment/docker-compose.prod.yml ps

echo ""
echo "=== Comprobación de salud HTTP Backend ==="
if curl -sf http://localhost:8080/actuator/health > /dev/null; then
    echo "Backend Spring Boot: OK"
else
    echo "Backend Spring Boot: ERROR / NO RESPONDE"
    exit 1
fi

echo ""
echo "=== Comprobación de PostgreSQL ==="
if docker exec benigascode-postgres-prod pg_isready -U "${DB_USER:-benigascode_user}" -d "${DB_NAME:-benigascode}"; then
    echo "PostgreSQL: OK"
else
    echo "PostgreSQL: ERROR"
    exit 1
fi

echo ""
echo "=== Comprobación de Runner Agent ==="
if docker ps --filter "name=benigascode-runner-prod" --format '{{.Status}}' | grep -q "Up"; then
    echo "Runner Agent: OK (Activo)"
else
    echo "Runner Agent: ERROR / INACTIVO"
    exit 1
fi

echo "Todos los servicios están saludables."

