#!/bin/bash
set -euo pipefail

# Benigascode Automated Backup Script for Oracle Cloud Always Free
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/benigascode"
BACKUP_FILE="${BACKUP_DIR}/benigascode_db_${TIMESTAMP}.sql.gz"
CONTENT_BACKUP="${BACKUP_DIR}/benigascode_content_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Iniciando backup de base de datos PostgreSQL..."
docker exec benigascode-postgres-prod pg_dump -U "${DB_USER:-benigascode_user}" -d "${DB_NAME:-benigascode}" | gzip > "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

echo "[$(date)] Realizando snapshot de artefactos inmutables de contenido..."
tar -czf "${CONTENT_BACKUP}" -C /var/lib/benigascode/content . 2>/dev/null || true
chmod 600 "${CONTENT_BACKUP}"

echo "[$(date)] Backup local completado en ${BACKUP_DIR}."

# Rotación local: eliminar backups locales más antiguos de 14 días
find "${BACKUP_DIR}" -type f -name "benigascode_*" -mtime +14 -delete

# Subida a OCI Object Storage si está configurado el bucket
if [ -n "${OCI_BUCKET_NAME:-}" ]; then
    echo "[$(date)] Subiendo backup a OCI Object Storage bucket: ${OCI_BUCKET_NAME}..."
    oci os object put --bucket-name "${OCI_BUCKET_NAME}" --file "${BACKUP_FILE}" --name "db/benigascode_db_${TIMESTAMP}.sql.gz" --force
    oci os object put --bucket-name "${OCI_BUCKET_NAME}" --file "${CONTENT_BACKUP}" --name "content/benigascode_content_${TIMESTAMP}.tar.gz" --force
    echo "[$(date)] Subida a OCI completada exitosamente."
fi

echo "[$(date)] Proceso de backup finalizado correctamente."

