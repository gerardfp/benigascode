#!/bin/bash
set -euo pipefail

# Benigascode Database and Content Restore Script
if [ "$#" -lt 1 ]; then
    echo "Uso: $0 <ruta_al_archivo_backup_sql.gz> [ruta_al_archivo_content.tar.gz]"
    exit 1
fi

DB_BACKUP_FILE="$1"
CONTENT_BACKUP_FILE="${2:-}"

if [ ! -f "${DB_BACKUP_FILE}" ]; then
    echo "Error: El archivo de base de datos ${DB_BACKUP_FILE} no existe."
    exit 1
fi

echo "ADVERTENCIA: Esta operación restaurará la base de datos reemplazando los datos actuales."
read -p "¿Deseas continuar? (escribe 'SI'): " CONFIRM
if [ "${CONFIRM}" != "SI" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo "[$(date)] Deteniendo backend para evitar escrituras durante la restauración..."
docker compose -f deployment/docker-compose.prod.yml stop backend runner

echo "[$(date)] Restaurando base de datos PostgreSQL desde ${DB_BACKUP_FILE}..."
gunzip -c "${DB_BACKUP_FILE}" | docker exec -i benigascode-postgres-prod psql -U "${DB_USER:-benigascode_user}" -d "${DB_NAME:-benigascode}"

if [ -n "${CONTENT_BACKUP_FILE}" ] && [ -f "${CONTENT_BACKUP_FILE}" ]; then
    echo "[$(date)] Restaurando artefactos de contenido desde ${CONTENT_BACKUP_FILE}..."
    mkdir -p /var/lib/benigascode/content
    tar -xzf "${CONTENT_BACKUP_FILE}" -C /var/lib/benigascode/content
fi

echo "[$(date)] Reiniciando servicios..."
docker compose -f deployment/docker-compose.prod.yml start backend runner

echo "[$(date)] Restauración completada con éxito."

