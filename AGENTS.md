# Directrices y Reglas para Benigascode

## ⚠️ Regla Estricta: Despliegue en Producción
- **NO realizar ningún despliegue en el entorno de producción** (servidor remoto Oracle Cloud, `benigaslo.dev`, conexión SSH al servidor remoto, ejecución de `docker-compose.prod.yml` en producción, etc.) hasta que el **USUARIO lo indique explícitamente**.
- Todo el trabajo de desarrollo, compilación, refactorización y pruebas automatizadas debe realizarse exclusivamente en el **entorno local de desarrollo** (contenedores locales / tests).
- Cuando los cambios estén listos y verificados localmente, se informará al usuario y se esperará su confirmación explícita antes de tocar el entorno de producción.

