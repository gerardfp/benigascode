# ADR-004: Aislamiento del Runner y Política de Sandbox

## Estado
Aceptado

## Contexto
El código enviado por los alumnos se considera hostil y potencialmente malicioso (ataques de denegación de servicio por memoria/procesos/CPU/output, acceso no autorizado al host o a la red, acceso a metadatos de Oracle Cloud en 169.254.169.254, robo de credenciales de PostgreSQL o GitHub).

## Decisión
El runner agent se diseña bajo el principio de menor privilegio y confianza cero:
1. **Runner desacoplado:** El runner no tiene acceso directo a la base de datos PostgreSQL ni a credenciales de GitHub ni a secretos maestros de la aplicación. Se comunica con el backend mediante una API interna autenticada por token de runner.
2. **Ejecución confinada de contenedores:**
   Cada compilación y ejecución de código de alumno se realiza en un contenedor efímero con:
   - `--network none` (aislamiento total de red, imposibilidad de llamadas externas o a metadatos de nube).
   - `--memory 256m` / `--memory-swap 256m` (límite estricto de memoria).
   - `--cpus 1.0` (límite de CPU).
   - `--pids-limit 64` (prevención de bombas fork).
   - `--read-only` con tmpfs temporal montado en `/tmp` con límite de tamaño.
   - `--cap-drop ALL` y `--security-opt=no-new-privileges:true`.
   - Usuario sin privilegios (`uid 10001`).
   - Timeout en múltiples niveles (timeout del proceso interno, timeout externo de contenedor y timeout del job).
   - Truncado estricto del buffer de salida stdout/stderr (prevención de output flooding).
   - Limpieza garantizada de contenedores y directorios temporales en bloque `finally`.

## Consecuencias
- **Positivas:**
  - Máxima seguridad para la infraestructura del centro y la instancia cloud.
  - Imposibilidad de que el código del alumno acceda a tests privados fuera de su entorno de ejecución temporal ni a credenciales de base de datos.
- **Negativas:**
  - Requiere que el runner ejecute con acceso al daemon Docker para crear estos contenedores aislados.

