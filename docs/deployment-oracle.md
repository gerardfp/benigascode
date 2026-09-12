# Guía de Despliegue en Producción — Oracle Cloud Always Free (ARM64)

Esta guía detalla el aprovisionamiento, configuración y puesta en marcha de Benigascode sobre una instancia **OCI Ampere A1 (ARM64)** dentro de los límites gratuitos permanentes de Oracle Cloud.

---

## 1. Especificaciones de la Instancia

- **Procesador:** Ampere A1 (ARM64) — 2 OCPUs (o 2 instancias de 1 OCPU).
- **Memoria:** 12 GB RAM (conservador) o hasta 24 GB RAM.
- **Sistema Operativo:** Ubuntu 24.04 LTS (aarch64) u Oracle Linux 9 (aarch64).
- **Almacenamiento:** 50 GB Boot Volume (o hasta 200 GB gratuitos).

---

## 2. Configuración de Red y Firewall (VCN Security List)

En la consola de Oracle Cloud (Virtual Cloud Network):
1. **Ingress Rules:**
   - Puerto `80/TCP` desde `0.0.0.0/0` (HTTP para renovación de certificados Let's Encrypt por Caddy).
   - Puerto `443/TCP` desde `0.0.0.0/0` (HTTPS tráfico de usuarios).
   - Puerto `22/TCP` restringido a tu IP administrativa.
2. **Puertos estrictamente cerrados al exterior:**
   - Puerto `5432` (PostgreSQL) — solo accesible desde la red Docker interna `benigascode-network`.
   - Puertos internos del Runner o Spring Boot (`8080`).

En el firewall local de la VM (iptables/ufw):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Instalación de Docker en Ubuntu ARM64

```bash
# Actualizar sistema y prerequisitos
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

# Añadir repositorio oficial de Docker para ARM64
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
```

---

## 4. Despliegue de Benigascode

1. Clonar el repositorio en `/opt/benigascode`:
   ```bash
   sudo mkdir -p /opt/benigascode
   sudo chown $USER:$USER /opt/benigascode
   git clone <URL_REPOSITORIO> /opt/benigascode
   cd /opt/benigascode
   ```

2. Configurar variables de entorno de producción:
   Copiar `.env.example` a `.env` con permisos restringidos (`chmod 600 .env`):
   ```env
   # PostgreSQL
   DB_NAME=benigascode
   DB_USER=benigascode_user
   DB_PASSWORD=GENERATE_STRONG_RANDOM_PASSWORD_HERE
   
   # Benigascode Backend
   SPRING_PROFILES_ACTIVE=prod
   RUNNER_TOKEN=GENERATE_RUNNER_SECRET_TOKEN_HERE
   CONTENT_REPO_SSH_KEY_PATH=/etc/benigascode/keys/id_ed25519
   
   # Caddy & Dominio
   DOMAIN_NAME=benigascode.tudominio.edu.es
   LETSENCRYPT_EMAIL=admin@tudominio.edu.es

   # GitHub OAuth (Opcional - Sincronización de repositorios desde la UI de profesor)
   GITHUB_CLIENT_ID=tu_github_client_id
   GITHUB_CLIENT_SECRET=tu_github_client_secret
   GITHUB_REDIRECT_URI=https://benigascode.tudominio.edu.es/teacher/sync/github/callback
   ```

3. Arrancar los servicios con Docker Compose de Producción:
   ```bash
   docker compose -f deployment/docker-compose.prod.yml up -d
   ```

4. Comprobar salud de los contenedores:
   ```bash
   docker compose -f deployment/docker-compose.prod.yml ps
   curl -I https://benigascode.tudominio.edu.es/actuator/health
   ```

---

## 5. Despliegue Continuo Bajo Demanda mediante Git Tags (`v*`)

El repositorio incluye el flujo automatizado `.github/workflows/deploy-oracle.yml`.

### 5.1 Configuración de Secretos en GitHub
En tu repositorio de GitHub (**Settings → Secrets and variables → Actions → Repository secrets**), añade los siguientes 3 secretos:
1. `OCI_HOST`: La IP pública fija de tu máquina en Oracle Cloud (ej. `140.238.12.34`).
2. `OCI_USER`: `ubuntu` (o `opc` si utilizas la imagen de Oracle Linux).
3. `OCI_SSH_KEY`: El contenido íntegro de la clave privada SSH con la que creaste la instancia (el texto que empieza con `-----BEGIN OPENSSH PRIVATE KEY-----`).

### 5.2 Cómo desplegar una nueva versión
Cada vez que consideres que los avances de desarrollo deben reflejarse en producción, simplemente crea y envía un tag de versión:

```bash
# 1. Asegúrate de tener los cambios commiteados y subidos
git checkout main
git push origin main

# 2. Crea la etiqueta de versión (ej. v0.1.0, v0.2.0, etc.)
git tag v0.1.0

# 3. Envía el tag a GitHub (esto dispara el despliegue en OCI)
git push origin v0.1.0
```

GitHub Actions detectará el tag `v*`, se conectará vía SSH a la instancia de Oracle Cloud, descargará la versión exacta, reconstruirá los contenedores Docker y verificará que el backend responde con un código 200.

### 5.3 Despliegue Manual desde GitHub (Fallback)
Si en algún momento necesitas redesplegar sin crear un nuevo tag:
1. Ve a la pestaña **Actions** en tu repositorio de GitHub.
2. Selecciona **Deploy to Oracle Cloud (Release Tag / On-Demand)**.
3. Haz clic en **Run workflow** (puedes indicar una rama o tag específico en el campo de entrada).

---

## 6. Estrategia de Backups Automáticos con OCI Object Storage

El script `deployment/scripts/backup.sh` realiza un volcado diario con `pg_dump`, lo comprime con gzip y lo envía a un bucket de OCI Object Storage mediante `oci-cli` o API S3 compatible:

```bash
# Configurar cron diario a las 03:00 AM
0 3 * * * /opt/benigascode/deployment/scripts/backup.sh >> /var/log/benigascode-backup.log 2>&1
```

Procedimiento de recuperación documentado en `deployment/scripts/restore.sh`.


