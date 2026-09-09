# CodeLab — Master Implementation Specification v1.0

## INSTRUCCIONES MAESTRAS PARA EL AGENTE DE DESARROLLO

Estás implementando **CodeLab**, una plataforma educativa para ejercicios de programación con evaluación automática.

Este documento es la especificación maestra del proyecto.

Tu objetivo no es producir una demo ni un prototipo visual. Debes construir una aplicación funcional, mantenible, segura y desplegable en producción sobre **Oracle Cloud Always Free**.

---

# 0. REGLAS FUNDAMENTALES DE IMPLEMENTACIÓN

## 0.1 La especificación funcional es la fuente de verdad

La especificación funcional incluida en este documento define **qué debe hacer CodeLab**.

Las decisiones técnicas posteriores definen **cómo debe implementarse**.

Nunca sacrifiques un requisito funcional por simplificar la implementación sin identificar explícitamente el conflicto.

Si detectas una contradicción:

1. identifica el conflicto;
2. explica qué requisitos afecta;
3. elige la solución que preserve mejor:
   - reproducibilidad;
   - seguridad;
   - trazabilidad;
   - integridad de datos;
   - simplicidad;
4. documenta la decisión.

No inventes funcionalidades que no estén justificadas por la especificación.

---

# 1. OBJETIVO DEL PROYECTO

CodeLab debe permitir:

- almacenar y versionar ejercicios;
- organizar ejercicios en colecciones;
- importar contenidos desde un repositorio privado de GitHub;
- publicar contenidos de forma controlada;
- crear cursos y grupos;
- asignar actividades;
- controlar disponibilidad;
- controlar intentos;
- recibir código del alumnado;
- ejecutar código potencialmente malicioso de forma aislada;
- evaluar automáticamente;
- conservar un historial reproducible;
- proporcionar feedback;
- consultar progreso y resultados;
- permitir reevaluaciones;
- mantener trazabilidad completa.

El sistema debe poder evolucionar posteriormente hacia:

- múltiples lenguajes;
- GitHub como canal de entrega;
- ejecución local de tests;
- Moodle;
- autenticación externa;
- analítica;
- gamificación;
- hints;
- evaluación manual;
- múltiples runners.

---

# 2. DECISIONES TÉCNICAS OBLIGATORIAS

## 2.1 Arquitectura

Utiliza:

**Modular Monolith + Isolated Evaluation Runner**

NO implementar microservicios para el MVP.

La arquitectura será:

```text
                         INTERNET
                            |
                            v
                         CADDY
                            |
                            v
                  +-------------------+
                  |   CODELAB APP     |
                  |                   |
                  | Spring Boot API   |
                  | Learning          |
                  | Content           |
                  | Submission        |
                  | Evaluation        |
                  | Queue             |
                  +---------+---------+
                            |
                            v
                      PostgreSQL
                            |
                            |
                  Evaluation Jobs
                            |
                            v
                  +-------------------+
                  |  RUNNER AGENT     |
                  |                   |
                  | Docker/containers |
                  | Java evaluator    |
                  +-------------------+
```

El runner debe poder trasladarse posteriormente a otra máquina sin modificar el dominio de CodeLab.

---

# 3. INFRAESTRUCTURA OBJETIVO

El sistema debe funcionar con:

```text
Oracle Cloud Always Free
OCI Ampere A1
ARM64
2 OCPU
12 GB RAM
```

No asumir más recursos.

Si la cuenta dispone posteriormente de más recursos, deben poder utilizarse sin modificar la arquitectura.

## Distribución preferida

Si solamente se dispone de 2 OCPU / 12 GB:

```text
VM única:

CodeLab
PostgreSQL
Caddy
Runner
```

Pero el código debe mantener separación lógica suficiente para poder separar posteriormente:

```text
VM 1:
CodeLab + PostgreSQL

VM 2:
Runner
```

Si se dispone de recursos suficientes para dos instancias Always Free:

```text
VM APP
1 OCPU
6 GB

VM RUNNER
1 OCPU
6 GB
```

La separación del runner es preferible desde el punto de vista de seguridad.

---

# 4. RESTRICCIONES DE RECURSOS

No utilizar inicialmente:

- Kubernetes;
- Redis;
- RabbitMQ;
- Kafka;
- Elasticsearch;
- MongoDB;
- Prometheus;
- Grafana;
- service mesh;
- API Gateway externo;
- cloud database;
- servicios de pago.

No introducir una tecnología únicamente porque sea habitual en arquitecturas empresariales.

CodeLab tendrá aproximadamente:

```text
50 alumnos
50 usuarios concurrentes
~7 entregas/minuto en el escenario máximo estimado
```

PostgreSQL es suficiente.

La cola se implementará inicialmente sobre PostgreSQL.

---

# 5. STACK DEFINITIVO

## Backend

```text
Java 25 LTS
Spring Boot 4.1.x
Spring Framework 7
Spring Security
Spring Data JPA
Hibernate
Flyway
PostgreSQL JDBC
Bean Validation
Jackson
JUnit
Testcontainers
```

Utilizar la última versión estable compatible de Spring Boot 4.1.x disponible durante la implementación.

No utilizar Spring Boot 3 salvo incompatibilidad técnica demostrada.

---

# 6. JAVA DE LOS EJERCICIOS

El runtime inicial para los ejercicios será:

```text
Java 21
```

Esto es independiente de la versión de Java utilizada para ejecutar CodeLab.

Por tanto:

```text
CodeLab backend
    Java 25

Student exercise
    Java 21
```

El runtime del alumno debe ser tratado como un componente versionado.

Posteriormente podrán añadirse:

```text
Java 17
Java 25
Python
C
C++
JavaScript
...
```

sin modificar el modelo de Submission/Evaluation.

---

# 7. BASE DE DATOS

Utilizar:

```text
PostgreSQL 18
```

El modelo debe ser fundamentalmente relacional.

Utilizar `jsonb` únicamente cuando exista una razón clara para representar configuraciones variables.

No convertir todo el modelo en JSON.

---

# 8. FRONTEND

Utilizar:

```text
React
TypeScript
Vite
React Router
TanStack Query
```

El frontend debe ser una SPA.

Debe servirse como contenido estático.

Caddy será responsable de:

- HTTPS;
- servir frontend;
- reverse proxy hacia Spring Boot.

No utilizar SSR inicialmente.

---

# 9. AUTENTICACIÓN

MVP:

```text
usuario + contraseña
```

La arquitectura debe permitir posteriormente:

```text
Google
Microsoft
GitHub
LDAP
Moodle
SSO
```

Las credenciales deben almacenarse mediante un algoritmo moderno de password hashing, preferentemente:

```text
Argon2id
```

Nunca almacenar contraseñas en texto plano.

Para una SPA del mismo origen:

- utilizar sesión mediante cookie `HttpOnly`;
- `Secure`;
- `SameSite`;
- protección CSRF;
- no almacenar tokens de autenticación en `localStorage`.

No implementar JWT salvo que exista una necesidad real.

---

# 10. ROLES

Como mínimo:

```text
STUDENT
TEACHER
```

Puede existir:

```text
ADMIN
```

si resulta necesario para la implementación operativa.

No crear jerarquías complejas de permisos en el MVP.

---

# 11. ARQUITECTURA MODULAR DEL BACKEND

Organizar el backend por módulos funcionales.

Preferentemente:

```text
com.codelab
|
+-- identity
|
+-- content
|
+-- learning
|
+-- activities
|
+-- submissions
|
+-- evaluation
|
+-- runner
|
+-- audit
|
+-- infrastructure
```

No organizar toda la aplicación únicamente como:

```text
controllers/
services/
repositories/
entities/
```

Debe mantenerse una separación por dominio.

Dentro de cada módulo podrá existir:

```text
api/
application/
domain/
infrastructure/
```

---

# 12. PRINCIPIO FUNDAMENTAL DEL DOMINIO

Separar:

```text
CONTENT
    ↓
LEARNING
    ↓
SUBMISSION
    ↓
EVALUATION
    ↓
RESULTS
```

No mezclar estos conceptos.

---

# 13. ENTIDADES PRINCIPALES

Como mínimo:

```text
User
Course
Group
CourseMembership

Collection
CollectionVersion
CollectionItem

Exercise
ExerciseVersion

Activity
ActivityVersion
ActivityExercise

AccessGrant

Submission
Attempt

Evaluation
TestDefinition
TestResult

Runtime

ContentSync

AuditEvent
```

Entidades futuras:

```text
GitHubConnection
StudentProgress
Achievement
ManualEvaluation
```

---

# 14. DECISIÓN CRÍTICA: ACTIVITYVERSION

La especificación original define ExerciseVersion pero no versiona explícitamente Activity.

Esto debe corregirse.

Una actividad también debe tener una versión inmutable.

Ejemplo:

```text
Activity
    "Examen Arrays"

ActivityVersion 1
    ExerciseVersion 3
    attempts = 1
    feedback = LIMITED
    scoring = ...

ActivityVersion 2
    ExerciseVersion 4
    attempts = 1
    feedback = LIMITED
    scoring = ...
```

Una Submission debe apuntar a:

```text
ActivityVersion
ExerciseVersion
```

y no únicamente a Activity y Exercise.

Esto garantiza reproducibilidad.

---

# 15. POR QUÉ EXISTE ACTIVITYVERSION

Una actividad puede cambiar:

- ejercicios;
- versiones de ejercicios;
- pesos;
- intentos;
- fechas;
- modo de entrega;
- feedback;
- puntuación;
- reglas.

Si una actividad cambia después de una entrega, esa entrega histórica no debe reinterpretarse utilizando la configuración actual.

Por tanto:

```text
Submission
    |
    +-- ActivityVersion
    |
    +-- ExerciseVersion
    |
    +-- exact source
    |
    +-- Evaluation
```

---

# 16. IDENTIFICADORES

Utilizar UUID como identificador externo y preferentemente como PK.

No exponer identificadores secuenciales que permitan enumerar recursos privados.

---

# 17. EJERCICIO

`Exercise` es la identidad estable.

`ExerciseVersion` es inmutable.

Ejemplo:

```text
Exercise
    slug = calcular-media

ExerciseVersion
    v1
    v2
    v3
```

La Submission siempre debe referenciar una ExerciseVersion concreta.

---

# 18. INMUTABILIDAD

Una vez publicada una versión:

NO modificar:

- enunciado;
- tests;
- comparadores;
- configuración;
- runtime;
- puntuación;
- contenido técnico.

Crear nueva versión.

---

# 19. VERSIONADO DE CONTENIDO

Cada `ExerciseVersion` debe poder reconstruirse.

Debe almacenar o referenciar:

```text
content_version
source_git_commit
content_hash
manifest_hash
runtime_version
test_version
```

Utilizar SHA-256 para identificar contenido cuando corresponda.

---

# 20. COLECCIONES

Implementar:

```text
Collection
CollectionVersion
CollectionItem
```

Una Collection es identidad estable.

Una CollectionVersion representa una composición concreta.

---

# 21. COLECCIONES LINKED Y SNAPSHOT

Implementar explícitamente:

```text
LINKED
SNAPSHOT
```

### LINKED

Referencia una colección estable.

Sus contenidos pueden cambiar cuando cambia la colección referenciada.

### SNAPSHOT

Referencia una versión concreta.

No cambia aunque cambie la colección original.

---

# 22. CICLOS

Debe impedirse:

```text
A -> B -> C -> A
```

La validación debe realizarse:

- durante importación;
- antes de publicar;
- antes de crear referencias relevantes.

No confiar únicamente en la UI.

---

# 23. ACTIVIDADES

Una Activity representa la utilización docente de contenido.

Debe soportar:

```text
PRACTICE
EXAM
ASSIGNMENT
```

No crear tres entidades diferentes.

---

# 24. ACTIVITYVERSION

Debe congelar como mínimo:

```text
activity configuration
activity exercises
exercise versions
scoring
attempt policy
submission policy
feedback policy
availability rules
GitHub policy
```

---

# 25. DISPONIBILIDAD

Almacenar internamente timestamps UTC.

La actividad debe poder tener:

```text
available_from
available_until
due_at
timezone
```

No confundir:

```text
fecha de cierre
```

con:

```text
fecha límite
```

La semántica debe quedar documentada.

---

# 26. REGLA TEMPORAL

La validez de una Submission se determina utilizando:

```text
submission.created_at
```

y la ActivityVersion vigente en el momento de la entrega.

No utilizar la fecha de evaluación.

---

# 27. ACCESO

El alumno puede acceder mediante:

```text
PUBLIC
ASSIGNED
KEY
```

Los permisos deben comprobarse server-side.

Nunca confiar en ocultar elementos del frontend.

---

# 28. CATÁLOGO

No crear endpoints que permitan al alumno enumerar todo el catálogo.

Evitar:

```text
GET /api/exercises
GET /api/collections/all
```

si revelan recursos no autorizados.

Las consultas deben partir del contexto del usuario:

```text
GET /api/me/collections
GET /api/me/activities
```

---

# 29. ACCESSGRANT

Cuando el alumno obtiene acceso mediante clave:

crear una autorización persistente.

Registrar:

```text
student
collection/activity
mechanism
created_at
revoked_at
```

La clave original no se almacena.

Almacenar hash seguro.

---

# 30. CLAVES

Las claves deben soportar:

- hashing;
- revocación;
- regeneración;
- expiración;
- rate limiting;
- auditoría.

Nunca incluir una clave en una URL.

---

# 31. SUBMISSION

Una Submission es inmutable.

Debe conservar:

```text
id
student
activity
activity_version
exercise
exercise_version
source
language
delivery_channel
created_at
status
```

---

# 32. SOURCE SNAPSHOT

Debe conservarse exactamente el código evaluado.

No guardar únicamente:

```text
path
```

o:

```text
Git commit
```

como sustituto del código evaluado.

La Submission debe poder reconstruirse incluso si el repositorio original desaparece.

---

# 33. DELIVERY CHANNEL

Diseñar mediante una abstracción:

```text
SubmissionSource
```

Implementación inicial:

```text
WEB
```

Futura:

```text
GITHUB
```

No permitir que el canal de entrega contamine el motor de evaluación.

---

# 34. ATTEMPTS

Los intentos deben gestionarse transaccionalmente.

No hacer:

```text
check attempts
...
increment attempts
```

en operaciones separadas susceptibles de carrera.

Implementar una reserva/conteo atómico.

Una opción recomendada:

```text
AttemptLedger

RESERVED
CONSUMED
REFUNDED
```

o equivalente.

---

# 35. ERRORES DE SISTEMA

Un:

```text
SYSTEM_ERROR
```

no consume automáticamente un intento.

Ejemplos:

```text
runner unavailable
internal error
communication failure
evaluation infrastructure failure
```

---

# 36. ERRORES DEL ALUMNO

Pueden consumir intento:

```text
COMPILE_ERROR
TIMEOUT
RUNTIME_ERROR
INCORRECT
```

según configuración de la ActivityVersion.

---

# 37. PREVIEW / PUBLIC TEST RUN

Debe diferenciarse:

```text
PUBLIC TEST RUN
```

de:

```text
OFFICIAL SUBMISSION
```

Un preview:

- no consume intento por defecto;
- puede usar únicamente tests públicos;
- no genera una evaluación oficial;
- no revela tests privados.

Puede implementarse mediante una entidad separada:

```text
PreviewRun
```

o mediante un tipo explícito de ejecución que no contamine Submission oficial.

---

# 38. ESTADOS DE SUBMISSION

Implementar:

```text
PENDING
QUEUED
EVALUATING
FINISHED
CANCELLED
```

Y resultados:

```text
CORRECT
INCORRECT
COMPILE_ERROR
TIMEOUT
RUNTIME_ERROR
SYSTEM_ERROR
CANCELLED
```

No mezclar estado de procesamiento con resultado.

---

# 39. EVALUATION

Una Submission puede tener múltiples Evaluation.

Cada Evaluation debe ser inmutable.

Debe conservar:

```text
submission
exercise_version
activity_version
runtime
test_set_version
evaluator_version
started_at
finished_at
reason
result
score
```

---

# 40. REEVALUACIÓN

Una reevaluación crea:

```text
Evaluation #2
```

No modifica:

```text
Evaluation #1
```

La razón debe almacenarse:

```text
TEST_CORRECTION
COMPARATOR_CORRECTION
RUNNER_CORRECTION
SCORING_CORRECTION
MANUAL
OTHER
```

---

# 41. RESULTADOS DE TEST

Cada TestResult debe conservar:

```text
test_id
status
duration
stdout
stderr
expected_output
actual_output
score
```

Pero los campos sensibles deben filtrarse según la configuración de feedback.

---

# 42. TESTS PÚBLICOS Y PRIVADOS

Nunca devolver tests privados al cliente.

Los tests privados:

- no aparecen en API;
- no aparecen en frontend;
- no aparecen en repositorios del alumno;
- no aparecen en GitHub del alumno;
- no se incluyen en artefactos descargables por alumnos.

---

# 43. COMPARADORES

Implementar inicialmente:

```text
EXACT
TRIM
WHITESPACE_INSENSITIVE
LINE_INSENSITIVE
CASE_INSENSITIVE
NUMERIC_TOLERANCE
```

Diseñar una interfaz:

```text
Comparator
```

para permitir:

```text
CUSTOM
JUNIT
```

posteriormente.

---

# 44. PUNTUACIÓN

Normalizar internamente:

```text
0..100
```

Cada test puede tener:

```text
weight
required
public/private
```

Implementar al menos:

```text
PROPORTIONAL
WEIGHTED
REQUIRED_TESTS
```

Las penalizaciones deben diseñarse como extensión, no como lógica hardcoded.

---

# 45. RUNTIME

Entidad:

```text
Runtime
```

Debe identificar:

```text
language
version
container_image
image_digest
compiler_version
```

Nunca confiar solamente en:

```text
java:21
```

La evaluación debe registrar el digest real de la imagen.

---

# 46. EJERCICIOS JAVA MVP

El primer runner debe soportar ejercicios Java sencillos.

Convención inicial recomendada:

```text
Main.java
```

Compilación:

```text
javac
```

Ejecución:

```text
java
```

Entrada:

```text
stdin
```

Salida:

```text
stdout
```

Diseñar la arquitectura para permitir posteriormente:

- múltiples archivos;
- Maven;
- Gradle;
- JUnit;
- métodos/clases;
- proyectos completos.

---

# 47. CONFIGURACIÓN DE EJERCICIO

El formato de contenido debe poder expresar:

```yaml
id:
title:
language:
runtime:
statement:
examples:
public_tests:
private_tests:
compile:
run:
limits:
scoring:
feedback:
```

El formato definitivo debe diseñarse de manera extensible.

No acoplar el dominio de CodeLab directamente al YAML.

Debe existir una capa:

```text
GitHub content
      ↓
Parser
      ↓
Validated Content Model
      ↓
Domain
```

---

# 48. GITHUB DEL PROFESOR

El repositorio de contenidos es:

```text
PRIVATE
READ-ONLY FROM CODELAB
```

CodeLab nunca debe modificarlo.

El repositorio es la fuente de verdad del contenido docente.

---

# 49. CONTENIDO VS CONFIGURACIÓN DOCENTE

GitHub:

```text
exercise
statement
tests
runtime
technical configuration
examples
metadata
```

CodeLab:

```text
users
courses
groups
activities
assignments
dates
permissions
attempts
submissions
evaluations
progress
audit
```

---

# 50. SINCRONIZACIÓN GITHUB

Implementar una abstracción:

```text
ContentRepository
```

Inicialmente:

```text
GitHubContentRepository
```

La sincronización puede iniciarse mediante:

```text
MANUAL
SCHEDULED
WEBHOOK
```

En MVP se recomienda implementar primero:

```text
MANUAL
SCHEDULED
```

y dejar webhook preparado.

---

# 51. IMPORTACIÓN ATÓMICA

Nunca importar directamente sobre contenido publicado.

Pipeline:

```text
GitHub commit
     ↓
download/clone
     ↓
staging
     ↓
parse
     ↓
validate
     ↓
resolve references
     ↓
validate cycles
     ↓
calculate hashes
     ↓
persist new versions
     ↓
atomic publish/import
```

Si falla:

```text
old published content remains valid
```

---

# 52. CONTENT SYNC

Registrar:

```text
ContentSync
```

con:

```text
id
started_at
finished_at
git_commit
status
errors
warnings
created_versions
```

Estados:

```text
RUNNING
SUCCESS
FAILED
```

---

# 53. ARTEFACTOS INMUTABLES

No depender exclusivamente del repositorio GitHub para reproducibilidad.

Durante la importación crear un snapshot inmutable de los artefactos necesarios para evaluación.

Identificarlo mediante hash.

Puede almacenarse inicialmente en:

```text
/var/lib/codelab/content/
```

con backup en Object Storage.

---

# 54. BACKUPS

PostgreSQL debe tener backup periódico.

Mínimo:

```text
daily pg_dump
```

Conservar varias copias.

Enviar backups a:

```text
OCI Object Storage
```

No almacenar backups únicamente en el mismo disco de la VM.

---

# 55. RUNNER

El runner es un componente de confianza limitada.

Debe recibir únicamente:

```text
source
exercise version
test artifact required for evaluation
runtime
limits
```

Nunca debe recibir:

```text
database credentials
GitHub credentials
application secrets
OCI credentials
```

---

# 56. RUNNER API

Diseñar una interfaz interna equivalente a:

```text
claim job
execute job
return result
heartbeat
```

La API externa de CodeLab no debe exponerse al runner como un usuario normal.

---

# 57. RUNNER COMMUNICATION

Preferencia:

```text
Runner -> CodeLab
```

mediante polling.

Esto evita tener que abrir públicamente un puerto de entrada para el runner.

Ejemplo:

```text
Runner
   |
   | claim
   v
CodeLab
   |
   | job package
   v
Runner
   |
   | result
   v
CodeLab
```

El runner debe autenticarse mediante una credencial específica de runner.

Nunca reutilizar credenciales de usuario.

---

# 58. QUEUE

Implementar inicialmente sobre PostgreSQL.

Tabla conceptual:

```text
evaluation_job
```

con:

```text
id
submission_id
status
priority
available_at
claimed_at
worker_id
attempts
lease_until
created_at
```

Utilizar:

```sql
FOR UPDATE SKIP LOCKED
```

para reclamar trabajos.

---

# 59. LEASE

Los trabajos deben tener lease.

Si un runner desaparece:

```text
lease expires
```

y el trabajo puede volver a:

```text
QUEUED
```

sin perder la Submission.

---

# 60. IDEMPOTENCIA

El runner debe poder recibir un trabajo de nuevo sin producir resultados duplicados incorrectamente.

El resultado debe estar asociado a:

```text
job_id
evaluation_id
attempt token
```

Implementar comprobaciones de idempotencia.

---

# 61. FAIRNESS

Implementar como mínimo:

```text
max 1 active evaluation/student
rate limiting
queue ordering
```

No permitir que un único alumno ocupe todos los runners.

Diseñar el scheduler para poder evolucionar posteriormente hacia:

```text
fair scheduling
weighted priority
```

---

# 62. LIMITES DEL RUNNER

Cada ejecución debe utilizar:

```text
--network none
--memory
--cpus
--pids-limit
--read-only
--cap-drop ALL
--security-opt=no-new-privileges:true
```

Además:

- timeout externo;
- timeout interno;
- output limit;
- temporary filesystem;
- no host mounts;
- no devices;
- usuario no privilegiado.

---

# 63. RED

El código del alumno no debe tener acceso a red.

Esto es obligatorio inicialmente:

```text
network = none
```

No permitir excepciones desde la configuración de un ejercicio MVP.

---

# 64. FILESYSTEM

El código debe ejecutarse en filesystem temporal.

Nunca montar:

```text
/
```

ni:

```text
/var/run/docker.sock
```

ni:

```text
/etc
```

ni directorios de la aplicación.

---

# 65. DOCKER SOCKET

El entorno que ejecuta código no debe recibir acceso al Docker socket.

El Docker socket solamente debe ser accesible por el proceso runner de confianza.

Nunca montar:

```text
/var/run/docker.sock
```

dentro del contenedor que ejecuta código de alumno.

---

# 66. RUNNER HOST

Preferentemente ejecutar el Runner en una VM separada.

El runner host no debe contener:

- PostgreSQL;
- credenciales GitHub;
- secretos de aplicación;
- claves de administración.

Si inicialmente se ejecuta todo en una única VM, documentar explícitamente que el aislamiento es inferior al modelo de dos nodos.

---

# 67. CONTENEDORES DE EJECUCIÓN

Utilizar imágenes ARM64 compatibles.

Las imágenes de runtime deben ser:

```text
versioned
digest-pinned
```

cuando sea posible.

---

# 68. SEGURIDAD DEL RUNNER

Considerar el código del alumno como hostil.

Probar explícitamente casos como:

```java
while(true) {}
```

```java
new byte[Integer.MAX_VALUE]
```

creación masiva de procesos;

salida infinita;

lectura de filesystem;

acceso a red;

intentos de acceder al metadata service;

lectura de variables de entorno;

intentos de escape del contenedor.

---

# 69. PROTECCIÓN OCI

Nunca permitir que el código ejecutado pueda acceder al:

```text
OCI metadata service
```

El runner debe bloquear cualquier acceso de red.

---

# 70. RATE LIMITING

Implementar límites para:

- login;
- acceso mediante clave;
- preview runs;
- submissions;
- endpoints sensibles.

No introducir Redis solo para rate limiting.

Para el MVP puede utilizarse un mecanismo local o basado en PostgreSQL.

---

# 71. API

API REST:

```text
/api/v1
```

No utilizar la API conceptual de la especificación como contrato definitivo.

Diseñar DTOs separados de entidades JPA.

No devolver entidades directamente.

---

# 72. API DEL ALUMNO

Como mínimo:

```text
GET  /api/v1/me

GET  /api/v1/me/collections

GET  /api/v1/me/activities

POST /api/v1/collections/access

GET  /api/v1/collections/{id}

GET  /api/v1/collections/{id}/exercises

GET  /api/v1/exercises/{id}

GET  /api/v1/exercises/{id}/public-tests

POST /api/v1/exercises/{id}/preview-runs

POST /api/v1/exercises/{id}/submissions

GET  /api/v1/submissions/{id}

GET  /api/v1/submissions/{id}/evaluations
```

Todos los endpoints deben realizar autorización server-side.

---

# 73. API DEL PROFESOR

Como mínimo:

```text
GET    /api/v1/teacher/courses
POST   /api/v1/teacher/courses

GET    /api/v1/teacher/groups
POST   /api/v1/teacher/groups

GET    /api/v1/teacher/activities
POST   /api/v1/teacher/activities

GET    /api/v1/teacher/submissions

GET    /api/v1/teacher/evaluations

POST   /api/v1/teacher/evaluations/{id}/reevaluate

GET    /api/v1/teacher/statistics

POST   /api/v1/teacher/content/sync
```

La API final puede diferir si existe una razón arquitectónica.

---

# 74. AUTORIZACIÓN

No utilizar únicamente:

```text
ROLE_STUDENT
ROLE_TEACHER
```

Para determinar acceso a recursos.

Debe comprobarse además:

```text
ownership
course membership
group membership
activity assignment
collection access
student identity
```

---

# 75. PREVENCIÓN DE IDOR

Todos los endpoints deben protegerse contra:

```text
Insecure Direct Object Reference
```

Ejemplo:

Un alumno no puede cambiar:

```text
/submissions/123
```

por:

```text
/submissions/124
```

y obtener la entrega de otro alumno.

---

# 76. FRONTEND — ALUMNO

Pantallas iniciales:

```text
Login

Inicio

Mis colecciones

Mis actividades

Detalle actividad

Detalle ejercicio

Editor de código

Tests públicos

Resultado

Historial

Progreso
```

No mostrar catálogo global.

---

# 77. FRONTEND — PROFESOR

Pantallas iniciales:

```text
Dashboard

Cursos

Grupos

Alumnos

Colecciones

Ejercicios

Actividades

Entregas

Resultados

Sincronización

Configuración
```

No implementar todavía un editor complejo de ejercicios dentro de CodeLab.

El contenido técnico se modifica en GitHub.

---

# 78. EDITOR DE CÓDIGO

Utilizar un editor web apropiado para programación.

Debe soportar inicialmente:

```text
Java
```

No es necesario implementar un IDE completo.

Funciones iniciales:

- edición;
- ejecutar tests públicos;
- enviar;
- mostrar resultado;
- mostrar errores.

---

# 79. ESTADO DEL PROGRESO

Implementar:

```text
NOT_STARTED
IN_PROGRESS
ATTEMPTED
PASSED
MASTERED
```

No usar únicamente:

```text
8/12
```

---

# 80. ACTIVIDAD POR ALUMNO

El estado debe calcularse separadamente para cada alumno.

Implementar una vista lógica:

```text
StudentActivityState
```

que pueda derivarse de:

- submissions;
- evaluations;
- availability;
- attempts.

---

# 81. HISTORIAL

El alumno debe poder consultar:

```text
submission
date
status
score
evaluation
```

Las submissions son inmutables.

---

# 82. AUDITORÍA

Crear:

```text
AuditEvent
```

Registrar como mínimo:

```text
LOGIN
COLLECTION_ACCESS
CONTENT_SYNC
CONTENT_PUBLISH
ACTIVITY_CREATE
ACTIVITY_UPDATE
SUBMISSION_CREATE
EVALUATION_START
EVALUATION_FINISH
REEVALUATION
```

No almacenar datos sensibles innecesarios.

---

# 83. LOGGING

Utilizar logs estructurados.

Cada operación relevante debe poder relacionarse mediante:

```text
correlation_id
submission_id
evaluation_id
user_id
```

Nunca escribir:

- passwords;
- tokens;
- GitHub private keys;
- secrets;
- private tests completos.

---

# 84. OBSERVABILIDAD

MVP:

```text
Spring Actuator
health endpoint
structured logs
Docker healthchecks
```

No desplegar inicialmente Prometheus/Grafana.

---

# 85. BASE DE DATOS Y MIGRACIONES

Utilizar Flyway.

Nunca modificar manualmente una migración ya aplicada.

Ejemplo:

```text
V1__initial_schema.sql
V2__users.sql
V3__courses.sql
...
```

Todas las modificaciones de esquema deben ser migraciones.

---

# 86. TRANSACCIONES

Las operaciones críticas deben ser transaccionales.

Especialmente:

- crear submission + reservar intento;
- publicar ActivityVersion;
- importar contenido;
- reclamar job;
- finalizar evaluación;
- refund de intento por SYSTEM_ERROR.

---

# 87. CONCURRENCIA

Probar explícitamente:

- dos submissions simultáneas;
- dos intentos simultáneos;
- dos runners reclamando el mismo job;
- dos sincronizaciones;
- publicación simultánea;
- acceso concurrente mediante clave.

---

# 88. EXPORTACIÓN

MVP2:

```text
CSV
```

Diseñar el servicio de exportación de manera extensible.

Futuro:

```text
XLSX
JSON
```

---

# 89. GITHUB DEL ALUMNO

NO implementar en MVP1.

Diseñar una interfaz:

```text
SubmissionProvider
```

para poder añadir posteriormente:

```text
WebSubmissionProvider
GitHubSubmissionProvider
```

---

# 90. GITHUB DEL PROFESOR

Sí forma parte de MVP1.

Debe poder utilizarse como fuente privada de contenidos.

Para la primera implementación se puede utilizar un mecanismo de acceso de solo lectura, por ejemplo:

```text
read-only deploy key
```

o equivalente.

La credencial nunca debe aparecer en:

- Git;
- logs;
- frontend;
- base de datos en texto plano.

---

# 91. REPOSITORIO DE CONTENIDOS

Crear un ejemplo funcional de repositorio.

Propuesta inicial:

```text
codelab-content/

├── exercises/
│   └── calcular-media/
│       ├── exercise.yaml
│       ├── statement.md
│       ├── examples/
│       ├── public-tests/
│       └── private-tests/
│
├── collections/
│   └── java-basics/
│       └── collection.yaml
│
└── runtimes/
    └── java-21/
        └── runtime.yaml
```

La estructura debe poder evolucionar.

---

# 92. VALIDACIÓN DE CONTENIDO

Validar:

- YAML;
- referencias;
- IDs;
- slugs;
- ejercicios;
- colecciones;
- tests;
- runtimes;
- comandos;
- comparadores;
- límites;
- ciclos;
- versiones.

Los errores deben ser comprensibles para el profesor.

---

# 93. VERSIONADO DE TESTS

Los tests deben formar parte de ExerciseVersion.

No debe existir:

```text
Exercise v2
Test v3
```

sin una relación explícita.

---

# 94. MATERIAL DOCENTE

Debe poder existir:

```text
statement
examples
attachments
documentation
```

Los materiales privados deben respetar autorización.

---

# 95. RETENCIÓN

Diseñar una política configurable para:

```text
source
stdout
stderr
logs
test results
audit
```

Las submissions oficiales deben conservarse según las necesidades académicas.

No eliminar automáticamente información necesaria para reproducibilidad.

---

# 96. PRIVACIDAD

Regla:

```text
Student -> own data
Teacher -> authorized students
Student != other students
```

Nunca devolver resultados de otros alumnos.

---

# 97. GAMIFICACIÓN

NO implementar en MVP1.

No introducir dependencias de gamificación en el núcleo.

Preparar eventos/dominio para añadirla posteriormente.

---

# 98. HINTS

NO implementar en MVP1.

El modelo de actividad debe poder incorporar posteriormente:

```text
hint policy
penalty
```

sin modificar Submission.

---

# 99. EVALUACIÓN MANUAL

NO implementar en MVP1.

Pero no diseñar Evaluation de forma que impida posteriormente:

```text
automatic score
manual score
teacher comments
```

---

# 100. PLAGIO

NO implementar.

No crear sistema de detección de similitud.

Las submissions deben conservarse de forma que pueda añadirse posteriormente un servicio de análisis.

---

# 101. TESTING

El proyecto debe tener:

```text
unit tests
integration tests
repository tests
API tests
security tests
queue tests
runner tests
content validation tests
```

Utilizar Testcontainers para PostgreSQL cuando resulte apropiado.

---

# 102. TESTS DEL RUNNER

Crear tests de seguridad automatizados para:

```text
infinite loop
memory exhaustion
process explosion
infinite output
network access
filesystem access
environment inspection
timeout
compile error
runtime exception
correct program
incorrect program
```

---

# 103. TESTS DE REPRODUCIBILIDAD

Debe existir un test que demuestre:

```text
Exercise v1
    |
Submission
    |
Evaluation
```

y después:

```text
Exercise v2
```

La evaluación anterior sigue apuntando a:

```text
Exercise v1
```

---

# 104. TEST DE ACTIVITYVERSION

Debe demostrarse:

```text
ActivityVersion 1
    attempts=1
    ExerciseVersion=1

Submission 1
```

Después:

```text
ActivityVersion 2
    attempts=3
    ExerciseVersion=2
```

La Submission 1 sigue vinculada a:

```text
ActivityVersion 1
ExerciseVersion 1
```

---

# 105. TEST DE INTENTOS

Probar:

```text
attempt limit = 1
two concurrent submissions
```

El sistema debe permitir exactamente una Submission oficial válida.

---

# 106. TEST DE SYSTEM_ERROR

Simular:

```text
runner failure
```

Debe producir:

```text
SYSTEM_ERROR
```

y el intento no debe quedar consumido.

---

# 107. TEST DE AUTORIZACIÓN

Probar:

```text
Student A
Student B
Teacher A
Teacher B
```

Un alumno nunca debe poder acceder a:

- submission ajena;
- actividad ajena;
- colección privada ajena;
- resultados ajenos;
- tests privados.

---

# 108. TEST DE CLAVES

Probar:

- clave válida;
- clave inválida;
- clave expirada;
- clave revocada;
- demasiados intentos;
- regeneración;
- auditoría.

---

# 109. TEST DE IMPORTACIÓN ATÓMICA

Estado:

```text
v5 publicada
```

Importar:

```text
v6 inválida
```

Resultado:

```text
v5 sigue publicada
v6 no publicada
error visible
```

Nunca dejar el sistema en un estado parcialmente importado.

---

# 110. ESTRUCTURA DEL PROYECTO

Proponer inicialmente:

```text
codelab/
│
├── backend/
│
├── frontend/
│
├── runner/
│
├── content-example/
│
├── deployment/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── caddy/
│   └── scripts/
│
├── docs/
│
└── README.md
```

No crear un monorepo excesivamente complejo.

---

# 111. DOCKER COMPOSE

Desarrollo:

```text
backend
frontend
postgres
runner
```

Producción:

```text
caddy
backend
postgres
runner
```

Frontend debe compilarse como artefacto estático.

---

# 112. PRODUCCIÓN

No ejecutar:

```text
npm dev
```

ni:

```text
Spring Boot devtools
```

en producción.

---

# 113. CONFIGURACIÓN

Utilizar variables de entorno para:

```text
DATABASE_URL
DATABASE_USER
DATABASE_PASSWORD
GITHUB credentials
RUNNER_TOKEN
CONTENT_STORAGE_PATH
```

Nunca hardcodear secretos.

---

# 114. SECRETOS

No incluir secretos en:

```text
Git
Dockerfile
application.yml
frontend
logs
database
```

El `.env` de producción debe estar fuera del repositorio y protegido.

---

# 115. CADDY

Caddy será el reverse proxy inicial.

Debe proporcionar:

```text
HTTPS
HTTP -> HTTPS
frontend
/api -> backend
```

---

# 116. FIREWALL

Exponer públicamente únicamente:

```text
80
443
```

SSH debe restringirse tanto como sea razonablemente posible.

PostgreSQL nunca debe exponerse públicamente.

Runner API tampoco.

---

# 117. BACKUPS

Crear scripts para:

```text
pg_dump
compress
upload OCI Object Storage
rotation
```

Documentar recuperación.

---

# 118. HEALTHCHECKS

Implementar:

```text
backend health
postgres health
runner health
```

Docker Compose debe reiniciar servicios cuando sea apropiado.

---

# 119. ACTUALIZACIONES

La aplicación debe poder actualizarse sin destruir:

```text
database
content artifacts
backups
```

Nunca hacer:

```text
docker compose down -v
```

como procedimiento normal de despliegue.

---

# 120. CI/CD

Preparar CI para:

```text
backend build
frontend build
unit tests
integration tests
security tests
Docker build
```

Las imágenes deben ser compatibles con:

```text
linux/arm64
```

---

# 121. BUILD ARM64

Oracle A1 es ARM64.

Todo contenedor utilizado en producción debe tener soporte ARM64.

No asumir:

```text
amd64 only
```

---

# 122. COSTE

La arquitectura debe permanecer dentro del objetivo:

```text
0–5 €/mes
```

siempre que sea posible.

Priorizar:

- Oracle Always Free;
- PostgreSQL local;
- Object Storage Always Free;
- software open source.

---

# 123. NO SOBREARQUITECTURA

No implementar:

```text
Kubernetes
service mesh
Kafka
Redis
RabbitMQ
microservices
event sourcing completo
CQRS completo
```

salvo que aparezca una necesidad demostrable.

---

# 124. EVENTOS

Se pueden utilizar eventos internos de dominio para desacoplar módulos.

No convertirlos automáticamente en una arquitectura distribuida.

---

# 125. REGLA DE SIMPLICIDAD

Ante dos soluciones técnicamente válidas:

preferir la que tenga:

1. menos componentes;
2. menos memoria;
3. menos puntos de fallo;
4. mejor trazabilidad;
5. menor coste;
6. mayor facilidad de mantenimiento.

---

# 126. ORDEN DE IMPLEMENTACIÓN

Implementar en este orden.

## FASE 0

Bootstrap:

- repositorio;
- backend;
- frontend;
- runner;
- Docker Compose;
- PostgreSQL;
- CI.

Resultado:

```text
docker compose up
```

funciona.

---

## FASE 1

Identidad:

- User;
- roles;
- login;
- logout;
- sesiones;
- seguridad;
- autorización básica.

Resultado:

Alumno y profesor pueden iniciar sesión.

---

## FASE 2

Content Engine:

- Exercise;
- ExerciseVersion;
- Collection;
- CollectionVersion;
- CollectionItem;
- Runtime;
- ContentSync;
- parser;
- validator.

Resultado:

Un repositorio de ejemplo puede sincronizarse.

---

## FASE 3

Publishing:

- DRAFT;
- VALIDATED;
- PUBLISHED;
- ARCHIVED;
- access control;
- public/private collections;
- access keys.

Resultado:

El profesor puede publicar una colección y un alumno autorizado puede verla.

---

## FASE 4

Learning:

- Course;
- Group;
- Membership;
- Activity;
- ActivityVersion;
- ActivityExercise;
- assignments;
- availability.

Resultado:

El profesor puede asignar ejercicios a alumnos/grupos.

---

## FASE 5

Student UI:

- collections;
- activities;
- exercise page;
- editor;
- public tests.

Resultado:

El alumno puede trabajar con un ejercicio.

---

## FASE 6

Submission:

- Submission;
- Attempt;
- WEB provider;
- immutable source;
- attempt reservation.

Resultado:

El alumno puede realizar una entrega oficial.

---

## FASE 7

Evaluation Queue:

- evaluation job;
- PostgreSQL queue;
- leasing;
- retries;
- fairness;
- cancellation.

Resultado:

Las submissions entran en cola.

---

## FASE 8

Runner:

- Java 21 image;
- compilation;
- execution;
- timeout;
- memory;
- CPU;
- process limit;
- network isolation;
- output limit;
- sandbox.

Resultado:

El código Java se evalúa realmente.

---

## FASE 9

Evaluation:

- TestDefinition;
- TestResult;
- comparators;
- scoring;
- feedback;
- Evaluation.

Resultado:

El alumno recibe una evaluación reproducible.

---

## FASE 10

History:

- submission history;
- evaluation history;
- progress;
- student activity state.

---

## FASE 11

Teacher UI:

- courses;
- groups;
- activities;
- submissions;
- results;
- synchronization;
- basic statistics.

---

## FASE 12

Audit + export:

- AuditEvent;
- CSV;
- basic operational reports.

---

## FASE 13

Production hardening:

- HTTPS;
- firewall;
- backups;
- healthchecks;
- logs;
- security testing;
- ARM64;
- Oracle deployment.

---

# 127. MVP1 EXACTO

MVP1 debe terminar cuando pueda realizarse este flujo completo:

```text
Teacher
   |
   | creates content in GitHub
   v
Private GitHub repository
   |
   | sync
   v
CodeLab
   |
   | validate
   v
ExerciseVersion
   |
   | publish
   v
Collection
   |
   | authorize
   v
Student
   |
   | opens exercise
   v
Code editor
   |
   | public tests
   v
Preview execution
   |
   | official submit
   v
Submission
   |
   v
Queue
   |
   v
Runner
   |
   v
Java 21 sandbox
   |
   v
Evaluation
   |
   v
TestResults
   |
   v
Score
   |
   v
Student history
```

Si este flujo no funciona de extremo a extremo, MVP1 no está terminado.

---

# 128. MVP2

Después:

- complete courses;
- groups;
- assignments;
- dates;
- attempts;
- exam mode;
- practice mode;
- statistics;
- CSV export;
- reevaluation;
- audit;
- configurable feedback;
- GitHub student submission.

---

# 129. MVP3

Después:

- multiple languages;
- GitHub push;
- local tests;
- advanced dashboard;
- Apache ECharts;
- learning analytics;
- achievements;
- gamification;
- hints;
- Moodle;
- external authentication.

---

# 130. NO IMPLEMENTAR TODAVÍA

No implementar en MVP1:

- plagiarism;
- gamification;
- hints;
- Moodle;
- student GitHub;
- multiple languages;
- manual grading;
- advanced analytics;
- ECharts dashboard;
- external identity providers.

Preparar interfaces para ellos, pero no implementar el producto.

---

# 131. DEFINICIÓN DE DONE

Una fase solamente está terminada cuando:

```text
compiles
+
tests pass
+
security checks pass
+
database migrations work
+
docker compose works
+
documentation updated
```

No considerar terminado algo simplemente porque el código ha sido escrito.

---

# 132. REGLA DE TRABAJO PARA GEMINI

No generes todo el proyecto de una sola vez.

Trabaja incrementalmente.

Para cada fase:

1. analiza;
2. diseña;
3. implementa;
4. ejecuta tests;
5. corrige errores;
6. revisa seguridad;
7. actualiza documentación;
8. muestra qué queda terminado;
9. continúa con la siguiente fase.

No saltar directamente a fases posteriores si las anteriores tienen errores fundamentales.

---

# 133. AUTONOMÍA

Puedes tomar decisiones de implementación que no estén especificadas siempre que:

- no contradigan la especificación;
- simplifiquen el sistema;
- mejoren seguridad;
- mejoren mantenibilidad;
- sean compatibles con Oracle Free Tier.

Documenta las decisiones importantes en:

```text
docs/architecture-decisions/
```

---

# 134. ADR

Crear Architecture Decision Records para decisiones relevantes.

Formato:

```text
ADR-001-modular-monolith.md
ADR-002-postgresql-queue.md
ADR-003-activity-versioning.md
ADR-004-runner-isolation.md
ADR-005-session-authentication.md
```

---

# 135. DECISIONES QUE NO DEBES REABRIR

Salvo incompatibilidad demostrable:

```text
Modular monolith
PostgreSQL
Docker
PostgreSQL queue
React + TypeScript
Spring Boot
Oracle Free Tier
isolated runner
immutable versions
ActivityVersion
```

---

# 136. CRITERIO DE REPRODUCIBILIDAD

Para cualquier Evaluation debe ser posible responder:

```text
WHO?
WHAT EXERCISE?
WHAT EXERCISE VERSION?
WHAT ACTIVITY?
WHAT ACTIVITY VERSION?
WHAT SOURCE?
WHAT COMMIT?
WHAT TESTS?
WHAT TEST VERSION?
WHAT RUNTIME?
WHAT IMAGE DIGEST?
WHEN?
WHAT RESULT?
WHAT SCORE?
```

Si alguna de estas respuestas no puede determinarse, revisar el diseño.

---

# 137. CRITERIO DE SEGURIDAD

Nunca permitir simultáneamente al código del alumno:

```text
student code
+
private tests
+
application credentials
+
database
+
host filesystem
+
network
```

El runner debe recibir solamente lo estrictamente necesario.

---

# 138. CRITERIO DE PRIVACIDAD

Nunca permitir que un alumno:

```text
enumere ejercicios no autorizados
enumere colecciones privadas
lea submissions ajenas
lea evaluaciones ajenas
lea tests privados
lea secretos
```

Incluso si conoce el UUID del recurso.

---

# 139. CRITERIO DE INTEGRIDAD

Una vez creados:

```text
Submission
Evaluation
ExerciseVersion
ActivityVersion
```

no deben modificarse de forma destructiva.

Las correcciones generan nuevas entidades/versiones/historial.

---

# 140. CRITERIO DE ESCALABILIDAD

La implementación inicial puede utilizar:

```text
1 runner
```

pero el dominio no debe asumir:

```text
singleton runner
```

El scheduler debe poder gestionar posteriormente:

```text
runner 1
runner 2
runner 3
...
```

---

# 141. DOCUMENTACIÓN OBLIGATORIA

Crear:

```text
README.md

docs/
├── architecture.md
├── database.md
├── content-format.md
├── evaluation.md
├── runner-security.md
├── deployment-oracle.md
├── development.md
└── architecture-decisions/
```

---

# 142. README

El README debe permitir a un desarrollador nuevo ejecutar:

```text
git clone
docker compose up
```

y comenzar a utilizar CodeLab en desarrollo.

---

# 143. CONTENT EXAMPLE

El repositorio debe incluir al menos un ejercicio completamente funcional:

```text
calcular-media
```

con:

- statement;
- examples;
- public tests;
- private tests;
- Java 21;
- comparator;
- scoring.

---

# 144. DEMO END-TO-END

Crear datos de desarrollo:

```text
Teacher
Student
Course
Group
Collection
Exercise
ExerciseVersion
Activity
ActivityVersion
```

y demostrar:

```text
student -> submit -> queue -> runner -> evaluation -> result
```

---

# 145. DATOS DE PRUEBA

Los datos de desarrollo nunca deben incluir:

- credenciales reales;
- tokens reales;
- claves GitHub reales;
- secretos.

---

# 146. MIGRACIONES

La aplicación debe poder iniciarse con una base de datos vacía:

```text
docker compose up
```

y Flyway debe crear el esquema automáticamente.

---

# 147. ERROR HANDLING

La API debe devolver errores estructurados.

Por ejemplo:

```json
{
  "code": "ACTIVITY_NOT_AVAILABLE",
  "message": "Activity is not currently available",
  "requestId": "..."
}
```

No devolver stack traces al usuario.

---

# 148. VALIDACIÓN

Validar siempre en backend.

Frontend validation es solamente una ayuda de UX.

---

# 149. PAGINACIÓN

Todas las consultas potencialmente grandes deben paginarse.

Especialmente:

- submissions;
- students;
- courses;
- activities;
- audit events.

---

# 150. PERFORMANCE

No optimizar prematuramente.

Pero evitar:

- N+1 queries;
- cargar todo el catálogo;
- respuestas gigantes;
- polling agresivo;
- consultas sin índices.

---

# 151. ÍNDICES

Crear índices para:

```text
Submission.student_id
Submission.activity_id
Submission.exercise_version_id
Evaluation.submission_id
Activity.course_id
ActivityVersion.activity_id
CourseMembership.student_id
AccessGrant.student_id
ContentSync.created_at
EvaluationJob.status
EvaluationJob.available_at
```

Revisar con `EXPLAIN` cuando sea necesario.

---

# 152. JSONB

Puede utilizarse para:

```text
compile_config
run_config
feedback_config
scoring_config
```

siempre que el núcleo relacional permanezca claro.

No usar JSONB para relaciones fundamentales.

---

# 153. FECHAS

Utilizar:

```text
Instant
```

en backend para timestamps.

Persistir timestamps con timezone.

Convertir a:

```text
Europe/Madrid
```

solamente en la interfaz.

---

# 154. SLUGS

Utilizar slugs para contenido humano:

```text
calcular-media
arrays-basicos
```

pero no utilizarlos como única identidad técnica.

---

# 155. ELIMINACIÓN

Evitar hard delete de entidades históricas.

Preferir:

```text
ARCHIVED
REVOKED
CANCELLED
```

cuando exista información académica asociada.

---

# 156. PUBLICACIÓN

La publicación debe ser una operación explícita.

Importar desde GitHub no implica publicar.

Validar no implica publicar.

---

# 157. VISIBILIDAD

Separar:

```text
exists
imported
validated
published
visible
authorized
```

Son conceptos diferentes.

---

# 158. COLECCIÓN PÚBLICA

Una colección pública puede descubrirse según configuración.

Pero la capacidad de entregar requiere:

```text
authenticated user
```

---

# 159. EJERCICIO NO PUBLICADO

Un alumno nunca debe poder deducir la existencia de un ejercicio no autorizado simplemente probando UUIDs.

Los errores deben evitar filtraciones de información.

---

# 160. SEGURIDAD DE INFORMACIÓN

Evitar respuestas como:

```text
Exercise exists but you don't have access
```

cuando eso permita enumerar recursos privados.

Usar respuestas equivalentes a:

```text
404
```

cuando sea apropiado.

---

# 161. GITHUB SOURCE OF TRUTH

Nunca implementar:

```text
GitHub -> overwrite published database
```

directamente.

Siempre:

```text
GitHub
  ↓
staging
  ↓
validation
  ↓
version
  ↓
publish
```

---

# 162. HISTORIAL

Nunca eliminar una versión porque una nueva versión la sustituya.

---

# 163. EVALUATION ARTIFACT

Cada Evaluation debe poder identificar exactamente el artefacto utilizado.

Ejemplo:

```text
evaluation
    exerciseVersionId
    testSetHash
    runtimeId
    runtimeImageDigest
    evaluatorVersion
```

---

# 164. RUNNER RESULT

El runner debe devolver datos estructurados, no únicamente texto.

Por ejemplo:

```json
{
  "status": "FINISHED",
  "result": "INCORRECT",
  "compile": {
    "success": true,
    "stdout": "",
    "stderr": ""
  },
  "tests": [
    {
      "id": "test-01",
      "status": "PASSED",
      "durationMs": 32
    }
  ]
}
```

---

# 165. RUNNER NO DECIDE AUTORIZACIÓN

El runner ejecuta.

No decide:

- quién puede ejecutar;
- qué actividad tiene;
- cuántos intentos quedan;
- qué alumno es.

Eso pertenece al backend.

---

# 166. RUNNER NO ACCEDE A DATABASE

El runner no necesita acceso directo a PostgreSQL.

Toda comunicación debe realizarse mediante interfaz controlada.

---

# 167. RUNNER NO ACCEDE A GITHUB

El runner no debe tener credenciales GitHub.

---

# 168. RUNNER NO GUARDA SECRETOS

El runner debe tener únicamente su credencial de comunicación con CodeLab.

---

# 169. RETRIES

Distinguir:

```text
student failure
system failure
runner failure
network failure
```

Solo los fallos de infraestructura deben reintentarse automáticamente.

---

# 170. CANCELACIÓN

Cancelar un job no debe borrar:

```text
Submission
Evaluation history
Audit
```

---

# 171. REEVALUACIÓN

Nunca reemplazar una Evaluation anterior.

---

# 172. SCORING

Separar:

```text
Test evaluation
Score calculation
Activity grading
Course grading
```

No mezclar todas las ponderaciones en una única función.

---

# 173. COURSE GRADE

No implementar una fórmula académica rígida.

El modelo debe permitir diferentes ponderaciones.

---

# 174. PROGRESS

Progress debe ser derivable o recalculable.

No depender de una única columna mutable que pueda quedar inconsistente.

---

# 175. ACHIEVEMENTS

Futuro.

No introducir tablas de gamificación en MVP1 salvo que sean necesarias para preparar la arquitectura.

---

# 176. ANALYTICS

No almacenar métricas derivadas irreversibles si pueden calcularse desde eventos/submissions.

Optimizar posteriormente si fuera necesario.

---

# 177. API VERSIONING

Utilizar:

```text
/api/v1
```

No cambiar contratos públicamente sin versionado.

---

# 178. OPENAPI

Generar documentación OpenAPI para desarrollo.

No exponer endpoints internos sensibles públicamente.

---

# 179. ACTUATOR

Exponer únicamente endpoints necesarios.

Nunca exponer:

```text
env
beans
configprops
loggers
heapdump
threaddump
```

públicamente.

---

# 180. DEPLOYMENT SCRIPT

Crear scripts:

```text
deploy.sh
backup.sh
restore.sh
healthcheck.sh
```

---

# 181. RESTORE

Documentar un procedimiento completo:

```text
new VM
restore PostgreSQL
restore content artifacts
restore configuration
start CodeLab
verify
```

---

# 182. ORACLE

La aplicación debe desplegarse en:

```text
OCI Ampere A1 ARM64
```

No asumir x86.

---

# 183. ORACLE DISK

Separar conceptualmente:

```text
application
database
content artifacts
backups
```

No utilizar el mismo directorio para todo.

---

# 184. STORAGE

Los artefactos de contenido y backups pueden utilizar:

```text
OCI Object Storage
```

cuando sea conveniente.

La aplicación debe poder funcionar incluso si Object Storage está temporalmente inaccesible.

---

# 185. BACKUP FAILURE

Un fallo de backup no debe detener CodeLab.

Debe:

```text
log
alert
retry
```

---

# 186. DATABASE FAILURE

Si PostgreSQL está temporalmente indisponible:

- API debe fallar de forma controlada;
- no perder submissions;
- no consumir intentos incorrectamente.

---

# 187. RUNNER FAILURE

Si runner desaparece:

```text
job lease expires
job requeued
submission remains
attempt not consumed
```

según política.

---

# 188. SECURITY REVIEW ANTES DE MVP1

Antes de considerar terminado MVP1 realizar una revisión explícita de:

```text
authentication
authorization
IDOR
CSRF
rate limiting
secret exposure
private tests
runner isolation
network isolation
filesystem isolation
Docker escape assumptions
SQL injection
XSS
path traversal
command injection
```

---

# 189. PATH SECURITY

Nunca construir rutas del filesystem directamente desde valores proporcionados por el alumno.

Validar:

```text
exercise id
file names
artifact paths
```

---

# 190. COMMAND SECURITY

Los comandos de compilación/ejecución procedentes del contenido docente deben validarse.

Nunca permitir que un alumno modifique la configuración de ejecución.

---

# 191. CONTENT TRUST

El repositorio del profesor se considera contenido confiable.

El repositorio del alumno se considera contenido no confiable.

No confundir ambos niveles de confianza.

---

# 192. COMPILATION

El compilador debe ejecutarse dentro del sandbox.

No ejecutar:

```text
javac
```

directamente en el host.

---

# 193. TESTS PRIVADOS

Los tests privados pueden entrar en el sandbox únicamente durante la evaluación.

No deben persistir en el filesystem compartido del runner después de finalizar.

Limpiar siempre el workspace.

---

# 194. CLEANUP

Después de cada ejecución:

```text
container removed
workspace removed
temporary files removed
```

Incluso si existe error o timeout.

---

# 195. TIMEOUT

El timeout debe tener varias capas:

```text
test timeout
process timeout
container timeout
job timeout
```

Evitar depender de una única capa.

---

# 196. OUTPUT LIMIT

Limitar:

```text
stdout
stderr
```

para evitar ataques de output flooding.

---

# 197. PROCESS LIMIT

Utilizar límite de procesos.

---

# 198. MEMORY LIMIT

Utilizar límite de memoria del contenedor.

---

# 199. CPU LIMIT

Utilizar límite de CPU.

---

# 200. EVALUATION CONCURRENCY

Inicialmente:

```text
1 runner
1 evaluación simultánea
```

Si existe CPU suficiente, permitir configuración posterior.

---

# 201. FAIR QUEUE MVP

Implementar:

```text
FIFO
+
max 1 active/student
+
rate limit
```

y diseñar la estructura para mejorar posteriormente el scheduler.

---

# 202. FRONTEND SECURITY

No confiar en:

```text
hidden buttons
disabled buttons
route guards
```

La seguridad siempre reside en backend.

---

# 203. FRONTEND DATA

No descargar al navegador:

```text
private tests
teacher-only information
other students
```

aunque posteriormente no se muestre.

---

# 204. ERROR MESSAGES

Los mensajes para alumnos no deben revelar:

- existencia de recursos privados;
- stack traces;
- infraestructura;
- private test details.

---

# 205. ACCESSIBLE UI

Utilizar HTML semántico.

Preparar:

```text
keyboard navigation
labels
focus management
contrast
```

No convertir accesibilidad en una refactorización posterior.

---

# 206. INTERNATIONALIZATION

No hardcodear toda la lógica de idioma.

Inicialmente:

```text
es
```

pero preparar una capa de traducción.

---

# 207. TIMEZONE

UI inicial:

```text
Europe/Madrid
```

Backend:

```text
UTC
```

---

# 208. FUTURE MULTI-LANGUAGE

El modelo:

```text
ExerciseVersion
Runtime
Submission
Evaluation
```

debe ser independiente del lenguaje.

---

# 209. FUTURE GITHUB SUBMISSION

Debe poder implementarse:

```text
GitHub webhook
     ↓
commit SHA
     ↓
Submission
```

sin modificar el juez.

---

# 210. FUTURE LOCAL TESTS

Los tests públicos deben poder empaquetarse posteriormente como:

```text
codelab test
```

La versión de los tests debe ser identificable.

---

# 211. FUTURE MOODLE

Moodle debe actuar como adaptador.

Nunca modificar el dominio para adaptarlo a Moodle.

---

# 212. FUTURE AUTH

La identidad externa debe mapearse a:

```text
User
```

El dominio educativo no debe depender del proveedor de identidad.

---

# 213. DOCUMENTACIÓN DE API

Cada endpoint debe documentar:

```text
request
response
authentication
authorization
errors
```

---

# 214. DOCUMENTACIÓN DE CONTENIDO

Documentar el formato inicial de ejercicios con ejemplos.

---

# 215. DOCUMENTACIÓN DEL RUNNER

Documentar:

```text
job protocol
security assumptions
resource limits
failure modes
```

---

# 216. DOCUMENTACIÓN DE DEPLOY

Documentar:

```text
Oracle VM
Docker
firewall
DNS
HTTPS
backup
restore
update
```

---

# 217. DEFINICIÓN DE MVP1 TERMINADO

MVP1 está terminado únicamente si:

### Profesor

Puede:

- iniciar sesión;
- sincronizar GitHub;
- ver errores de validación;
- ver ejercicios;
- ver versiones;
- ver colecciones;
- publicar;
- crear clave de acceso.

### Alumno

Puede:

- iniciar sesión;
- acceder a su colección;
- acceder a un ejercicio;
- ejecutar tests públicos;
- enviar Java;
- esperar en cola;
- recibir evaluación;
- consultar historial.

### Sistema

Puede:

- validar contenido;
- versionarlo;
- preservar versiones antiguas;
- gestionar intentos;
- ejecutar Java aislado;
- evaluar tests públicos/privados;
- puntuar;
- guardar Evaluation;
- sobrevivir a un fallo del runner;
- realizar backup.

---

# 218. CRITERIO FINAL

Antes de declarar CodeLab listo:

Ejecutar un escenario completo desde cero.

```text
docker compose up

create teacher

create student

sync content

validate content

publish collection

grant access

login student

open exercise

run public tests

submit incorrect code

receive INCORRECT

submit correct code

receive CORRECT

inspect history

modify exercise in GitHub

sync

create new ExerciseVersion

verify old Submission still points to old version

reevaluate old Submission

verify old Evaluation remains

verify new Evaluation references exact runtime/test/version

simulate runner failure

verify SYSTEM_ERROR

verify attempt policy

verify student cannot access another student's data

verify student cannot obtain private tests
```

Solo después considerar MVP1 funcional.

---

# 219. ESPECIFICACIÓN FUNCIONAL DE REFERENCIA

La especificación funcional original de CodeLab v0.2 proporcionada por el propietario del proyecto debe considerarse parte integrante de este documento.

Sus 108 apartados cubren:

1. concepto general;
2. modelo conceptual;
3. ejercicio;
4. versionado;
5. estados;
6. colecciones;
7. colecciones anidadas;
8. versiones de colecciones;
9. composición;
10. cursos;
11. grupos;
12. actividades;
13. modalidades;
14. disponibilidad;
15. visibilidad;
16. colecciones públicas;
17. claves;
18. asignaciones;
19. autorización;
20. tests públicos/privados;
21. ejemplos;
22. versionado de tests;
23. comparadores;
24. compilación;
25. ejecución;
26. runtimes;
27. submissions;
28. código;
29. intentos;
30. modalidad de envío;
31. reintentos;
32. fechas;
33. estados;
34. evaluaciones;
35. reevaluaciones;
36. tests;
37. puntuación;
38. resultados;
39. feedback;
40. pruebas preliminares;
41. ejecución local;
42. historial;
43. progreso;
44. puntuaciones;
45. GitHub alumno;
46. repositorio alumno;
47. push;
48. commit;
49. configuración GitHub;
50. seguridad GitHub;
51. GitHub profesor;
52. fuente de contenidos;
53. sincronización;
54. importación atómica;
55. validación;
56. publicación;
57. contenido/configuración docente;
58. profesor;
59. cursos;
60. actividades;
61. resultados;
62. exportación;
63. revisión manual;
64. auditoría;
65. permisos alumno;
66. permisos profesor;
67. identidad;
68. seguridad de claves;
69. seguridad de ejecución;
70. sandbox;
71. aislamiento;
72. cola;
73. equidad;
74. cancelación;
75. retención;
76. privacidad;
77. gamificación;
78. gamificación responsable;
79. analítica;
80. hints;
81. estado por alumno;
82. reglas temporales;
83. ejercicios anulados;
84. recalculación;
85. API;
86. arquitectura;
87. capacidad;
88. infraestructura;
89. coste;
90. escalabilidad;
91. disponibilidad;
92. modelo de datos;
93. relaciones;
94. reutilización;
95. reutilización de colecciones;
96. privacidad;
97. accesibilidad;
98. integraciones;
99. MVP1;
100. MVP2;
101. MVP3;
102. principios arquitectónicos;
103. regla de visibilidad;
104. trazabilidad;
105. seguridad;
106. objetivo final;
107. decisiones fuera de alcance;
108. exclusión de plagio.

**No eliminar ninguno de estos requisitos al implementar.**

Las decisiones técnicas de este documento amplían y concretan la especificación funcional, pero no la sustituyen.

---

# 220. REGLA ESPECIAL SOBRE CAMBIOS DE DISEÑO

Si durante la implementación descubres que alguna decisión de esta especificación es técnicamente incorrecta, no la cambies silenciosamente.

Debes:

```text
1. detectar
2. explicar
3. proponer
4. evaluar impacto
5. documentar ADR
6. implementar
```

La prioridad es:

```text
seguridad
>
integridad
>
reproducibilidad
>
corrección funcional
>
mantenibilidad
>
simplicidad
>
optimización
```

---

# 221. INSTRUCCIÓN FINAL

No construyas una maqueta.

Construye una primera versión real de CodeLab.

Debe poder desplegarse en Oracle Cloud Always Free, ejecutarse en ARM64 y soportar el flujo completo de aprendizaje:

```text
CONTENT
   ↓
LEARNING
   ↓
SUBMISSION
   ↓
QUEUE
   ↓
ISOLATED EVALUATION
   ↓
RESULT
   ↓
HISTORY
```

La prioridad absoluta del MVP es:

```text
FIABILIDAD
SEGURIDAD
REPRODUCIBILIDAD
SIMPLICIDAD
```

No añadas complejidad arquitectónica por prestigio tecnológico.

No implementes funcionalidades futuras antes de que el núcleo funcione correctamente.

Y, sobre todo:

> **Una evaluación histórica debe seguir siendo reproducible aunque el contenido actual de CodeLab haya cambiado.**
>
> **El código de un alumno nunca debe tener acceso a la infraestructura de confianza de CodeLab.**
>
> **La existencia de un ejercicio en GitHub nunca implica que un alumno pueda descubrirlo.**

Comienza por la FASE 0.

Antes de escribir una gran cantidad de código, presenta brevemente:

1. arquitectura propuesta;
2. estructura del repositorio;
3. modelo inicial de módulos;
4. Docker Compose;
5. estrategia de pruebas;
6. plan de ejecución de la FASE 0.

Después implementa la fase.

No continúes automáticamente saltándote fases incompletas.