# Directrices y Reglas para Benigascode

## ⚠️ Regla Estricta: Despliegue en Producción
- **NO realizar ningún despliegue en el entorno de producción** (servidor remoto Oracle Cloud, `benigaslo.dev`, conexión SSH al servidor remoto, ejecución de `docker-compose.prod.yml` en producción, etc.) hasta que el **USUARIO lo indique explícitamente**.
- Todo el trabajo de desarrollo, compilación, refactorización y pruebas automatizadas debe realizarse exclusivamente en el **entorno local de desarrollo** (contenedores locales / tests).
- Cuando los cambios estén listos y verificados localmente, se informará al usuario y se esperará su confirmación explícita antes de tocar el entorno de producción.

## ⚠️ Regla de Git: Pushes gestionados por el usuario
- **NUNCA ejecutar `git push`** (ni a ramas ni a tags remotos). El usuario se encarga personalmente de hacer todos los `git push`.
- El asistente puede preparar commits y tags en local, pero el envío al repositorio remoto lo realiza siempre el usuario.

## ⚠️ Regla de Diseño UI: Sin textos explicativos ni aclaraciones innecesarias
- **NO añadir párrafos explicativos, subtítulos redundantes, aclaraciones informativas ni banners de guía** en las páginas, formularios o cabeceras (por ejemplo: "Gestión centralizada de...", "Para hacer X dirígete a...", "Gestiona las cuentas de...", descripciones bajo títulos, notas de ayuda redundantes, etc.).
- La interfaz debe ser limpia, directa y minimalista, centrada exclusivamente en los controles, botones y datos, sin textos didácticos ni explicaciones obvias, salvo que el usuario lo solicite expresamente.

