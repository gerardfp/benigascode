# Modelo y Análisis de Seguridad — CodeLab

El modelo de seguridad de CodeLab asume que:
1. **El código del alumno es potencialmente malicioso.**
2. **El frontend nunca es un límite de confianza.**
3. **El runner es un componente de confianza limitada.**

---

## 1. Aislamiento del Sandbox de Evaluación

El código del alumno se compila y ejecuta dentro de un contenedor Docker efímero con las siguientes restricciones obligatorias:

| Parámetro | Configuración | Justificación |
|---|---|---|
| Red | `--network none` | Impide exfiltración de datos, ataques DDoS y acceso a metadatos de Oracle Cloud (`169.254.169.254`). |
| Memoria | `--memory 256m --memory-swap 256m` | Previene agotamiento de memoria del host (OOM). |
| CPU | `--cpus 1.0` | Previene acaparamiento de tiempo de cómputo del servidor. |
| Procesos | `--pids-limit 64` | Bloquea de forma garantizada cualquier ataque de bomba fork (`:(){ :|:& };:`). |
| Filesystem | `--read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m` | Impide escritura en el sistema operativo del contenedor. |
| Privilegios | `--cap-drop ALL --security-opt=no-new-privileges:true` | Elimina cualquier capability de Linux y bloquea escalada a root. |
| Usuario | `USER 10001:10001` | Ejecuta bajo un usuario sin privilegios ni entrada en `/etc/passwd`. |
| Dispositivos | Sin `--device` ni montajes del host | No hay acceso a hardware ni al Docker socket. |

---

## 2. Protección de Tests Privados

- Los tests privados **nunca** se envían al frontend ni se almacenan en repositorios a los que el alumno tenga acceso.
- Únicamente se inyectan en el directorio efímero de ejecución del contenedor del runner durante la evaluación oficial y se purgan de inmediato al finalizar.
- En las respuestas de la API (`SubmissionDTO`), los inputs y outputs esperados de los tests privados se enmascaran según la política de feedback configurada en la `ActivityVersion`.

---

## 3. Prevención de IDOR (Insecure Direct Object Reference)

En todos los controladores del backend:
- Un alumno únicamente puede consultar entregas donde `submission.student_id == current_user.id`.
- Un profesor únicamente puede consultar entregas y actividades pertenecientes a cursos donde sea docente asignado.
- El uso de UUIDs v4 aleatorios como clave primaria evita la enumeración secuencial de recursos. Si un alumno intenta acceder a un UUID no autorizado, la API devuelve `404 Not Found` en lugar de `403 Forbidden` para no revelar la existencia del recurso.

---

## 4. Autenticación y Gestión de Sesiones

- Contraseñas almacenadas con **Argon2id** (memory cost 64MB, parallelism 1, iterations 3).
- Cookies de sesión con flags:
  - `HttpOnly`: inaccesible mediante JavaScript (protección contra XSS).
  - `Secure`: solo transmitidas bajo HTTPS.
  - `SameSite=Lax`: mitigación de Cross-Site Request Forgery (CSRF).
- Token anti-CSRF obligatorio en cabecera `X-XSRF-TOKEN` para operaciones de mutación (`POST`, `PUT`, `DELETE`).
- Claves de acceso a colecciones almacenadas mediante hash seguro (SHA-256 con salt), nunca en texto plano.

