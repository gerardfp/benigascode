# Directrices y Reglas para Benigascode

## ⚠️ Regla Estricta: Despliegue en Producción y Git Push
- **El despliegue en producción se realiza exclusivamente mediante GitHub Actions** (`.github/workflows/deploy-oracle.yml`, disparado al hacer `git push` del tag `v*` a `origin`), y **solo bajo demanda explícita del usuario**.
- **NUNCA desplegar por SSH directo** al servidor remoto (`benigaslo.dev`), ni transferir archivos con `scp`/`rsync`, ni ejecutar `docker-compose.prod.yml` manualmente en el servidor.
- **NUNCA ejecutar `git push` por iniciativa propia**. Solo cuando el usuario solicite explícitamente desplegar (por ejemplo, pidiendo «tag y despliegue» o «desplegar»), el asistente preparará el commit y el tag `v*` en local y ejecutará `git push origin main --tags` para disparar el workflow de GitHub Actions.
- Todo el trabajo de desarrollo, compilación, refactorización y pruebas automatizadas debe realizarse en el **entorno local de desarrollo** hasta que el usuario indique desplegar.

## ⚠️ Regla de Diseño UI: Sin textos explicativos ni aclaraciones innecesarias
- **NO añadir párrafos explicativos, subtítulos redundantes, aclaraciones informativas ni banners de guía** en las páginas, formularios o cabeceras (por ejemplo: "Gestión centralizada de...", "Para hacer X dirígete a...", "Gestiona las cuentas de...", descripciones bajo títulos, notas de ayuda redundantes, etc.).
- La interfaz debe ser limpia, directa y minimalista, centrada exclusivamente en los controles, botones y datos, sin textos didácticos ni explicaciones obvias, salvo que el usuario lo solicite expresamente.

