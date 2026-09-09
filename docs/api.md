# Especificación de la API REST — CodeLab v1.0

Prefijo base: `/api/v1`

Todas las peticiones autenticadas utilizan cookies de sesión `HttpOnly` (`JSESSIONID`) y validan el token anti-CSRF en cabecera `X-XSRF-TOKEN` para métodos mutables (`POST`, `PUT`, `DELETE`).

---

## 1. Autenticación e Identidad

### `POST /api/v1/auth/login`
Inicia sesión con credenciales locales.
- **Request Body:**
  ```json
  {
    "username": "student@codelab.local",
    "password": "secretPassword123"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "id": "e6a2c3f1-4b2a-4f6b-9c8a-1a2b3c4d5e6f",
    "username": "student@codelab.local",
    "fullName": "Alumno Demo",
    "role": "STUDENT"
  }
  ```
- **Response 401 Unauthorized:** Credenciales incorrectas.

### `POST /api/v1/auth/logout`
Cierra la sesión y destruye la cookie de sesión.

### `GET /api/v1/me`
Devuelve la información del usuario autenticado actual.
- **Response 200 OK:** DTO del usuario autenticado.
- **Response 401 Unauthorized:** Si no hay sesión activa.

---

## 2. API del Alumno

> [!IMPORTANT]
> **No existe ningún endpoint global** tipo `GET /api/v1/exercises` ni `GET /api/v1/collections/all` que permita a un alumno enumerar recursos a los que no tiene acceso concedido.

### `GET /api/v1/me/collections`
Lista únicamente las colecciones a las que el alumno tiene acceso (públicas o autorizadas por asignación o clave).

### `GET /api/v1/me/activities`
Lista las actividades asignadas al alumno a través de sus cursos/grupos o directamente.

### `POST /api/v1/collections/access`
Solicita acceso a una colección privada mediante clave.
- **Request Body:**
  ```json
  {
    "accessKey": "ABC-72F-X9"
  }
  ```
- **Response 200 OK:** Información de la colección autorizada y creación de `AccessGrant`.
- **Response 400/404:** Clave inválida, expirada o revocada.

### `GET /api/v1/collections/{id}`
Obtiene el detalle de una colección autorizada.

### `GET /api/v1/collections/{id}/exercises`
Lista los ejercicios de una colección autorizada.

### `GET /api/v1/exercises/{id}`
Obtiene el enunciado, metadatos y ejemplos de un ejercicio autorizado.
- **Seguridad:** Los tests privados **nunca** se devuelven en este endpoint.

### `GET /api/v1/exercises/{id}/public-tests`
Obtiene la lista de tests públicos (entrada y salida esperada) de la versión activa.

### `POST /api/v1/exercises/{id}/preview-runs`
Ejecuta los tests públicos de forma preliminar (sandbox) sin consumir un intento oficial.
- **Request Body:**
  ```json
  {
    "code": "public class Main { ... }",
    "language": "java"
  }
  ```
- **Response 200 OK:** Resultado de ejecución de tests públicos (compilación, stdout, status).

### `POST /api/v1/activities/{activityId}/exercises/{exerciseId}/submissions`
Crea una entrega oficial vinculada a la actividad y al ejercicio.
- **Request Body:**
  ```json
  {
    "sourceCode": "public class Main { ... }",
    "language": "java"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "submissionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "QUEUED",
    "attemptNumber": 2,
    "createdAt": "2026-09-09T14:30:00Z"
  }
  ```
- **Response 403 Forbidden:** Si se ha superado el número de intentos permitidos o la actividad no está disponible.

### `GET /api/v1/submissions/{id}`
Consulta el estado y resultado de una entrega del alumno (previene IDOR en backend).

### `GET /api/v1/submissions/{id}/evaluations`
Consulta el historial de evaluaciones de la entrega.

---

## 3. API del Profesor (`/api/v1/teacher/...`)

Requiere rol `TEACHER` o `ADMIN`.

### `GET /api/v1/teacher/courses` y `POST /api/v1/teacher/courses`
Listado y creación de cursos académicos.

### `GET /api/v1/teacher/courses/{courseId}/groups` y `POST /api/v1/teacher/courses/{courseId}/groups`
Gestión de grupos y matriculación de alumnos.

### `GET /api/v1/teacher/activities` y `POST /api/v1/teacher/activities`
Gestión de actividades: creación, configuración de intentos, fechas límite (UTC), política de feedback y publicación.

### `POST /api/v1/teacher/content/sync`
Inicia una sincronización atómica desde el repositorio Git del profesor.

### `GET /api/v1/teacher/content/sync-status`
Consulta el historial y errores de validación de las sincronizaciones de contenido.

### `POST /api/v1/teacher/collections/{id}/publish`
Publica formalmente una versión de colección.

### `POST /api/v1/teacher/collections/{id}/access-keys`
Genera una nueva clave de acceso para una colección privada.

### `GET /api/v1/teacher/submissions`
Lista y filtra entregas de alumnos bajo los cursos del profesor.

### `POST /api/v1/teacher/evaluations/{id}/reevaluate`
Solicita una reevaluación con trazabilidad del motivo (`TEST_CORRECTION`, `SCORING_CORRECTION`, etc.).

### `GET /api/v1/teacher/export/submissions.csv`
Exporta las entregas y notas en formato CSV.

---

## 4. API Interna del Runner (`/api/v1/runner/...`)

Protegida mediante la cabecera `X-Runner-Token`:

### `POST /api/v1/runner/jobs/claim`
Reclama el siguiente trabajo pendiente de la cola utilizando `FOR UPDATE SKIP LOCKED`.
- **Response 200 OK:** Paquete de trabajo con código fuente, artefactos de test, runtime y límites de ejecución.
- **Response 204 No Content:** No hay trabajos pendientes.

### `POST /api/v1/runner/jobs/{id}/heartbeat`
Extiende el lease del trabajo en ejecución para evitar que sea considerado huérfano.

### `POST /api/v1/runner/jobs/{id}/result`
Envía el resultado estructurado de la evaluación (salida del compilador, resultados individuales de tests, tiempo, memoria).

