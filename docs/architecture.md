# Arquitectura del Sistema — Benigascode

## 1. Visión General

Benigascode es una plataforma diseñada para la práctica, seguimiento y evaluación automática de código de programación en contextos educativos.

El sistema se compone de dos subsistemas principales:
1. **Benigascode Modular Monolith (Core App):** Gestiona la identidad, cursos, actividades docentes, contenidos, sincronización, recepción inmutable de entregas y cola de evaluación.
2. **Benigascode Runner Agent (Evaluation Engine):** Proceso desacoplado que reclama trabajos de evaluación de forma atómica y los ejecuta en sandboxes efímeros de Docker.

```text
                                INTERNET
                                   │
                                   ▼
                             CADDY REVERSE PROXY
                       (:80 / :443 HTTPS Automático)
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
                ▼                                     ▼
        FRONTEND SPA (/...)                   BACKEND API (/api/v1/...)
    (React + TS + Tailwind)                (Spring Boot Modular Monolith)
                                                      │
                                                      ▼
                                                POSTGRESQL 18
                                                      │
                                                      │ (Pull Jobs: SKIP LOCKED)
                                                      ▼
                                              RUNNER AGENT WORKER
                                                      │
                                                      ▼
                                            SANDBOX DOCKER CONTAINER
                                             (Java 21, --network none,
                                              read-only, cap-drop ALL)
```

## 2. Flujo de Datos Fundamental

El sistema desacopla estrictamente cada una de las etapas:

```text
CONTENIDOS (GitHub privado del profesor)
   │ (Sync atómico con validación de hashes y detección de ciclos)
   ▼
VERSIONES DE CONTENIDO (ExerciseVersion, CollectionVersion)
   │ (Asignación en contexto docente con reglas de intentos y fechas)
   ▼
ACTIVIDAD (ActivityVersion inmutable)
   │ (Alumno realiza entrega de código fuente vía Web)
   ▼
ENTREGA (Submission inmutable + reserva atómica de intento)
   │ (Encolado automático en PostgreSQL)
   ▼
COLA DE EVALUACIÓN (EvaluationJob: FIFO + Fairness + Leases)
   │ (Runner reclama trabajo y ejecuta en sandbox)
   ▼
EVALUACIÓN (Evaluation inmutable + TestResults detallados)
   │ (Cálculo de puntuación 0-100 según ponderaciones)
   ▼
HISTORIAL Y PROGRESO (StudentActivityState, AuditEvent)
```

## 3. Módulos del Backend (`com.benigascode`)

1. **`identity`**: Gestión de usuarios (`STUDENT`, `TEACHER`, `ADMIN`), login/logout, sesiones por cookies HttpOnly con SameSite, hashing Argon2id.
2. **`content`**: Modelo de ejercicios y colecciones, versionado inmutable, parser y validador de contenido YAML, importación atómica desde repositorios Git.
3. **`learning`**: Cursos académicos, grupos de alumnos, matrículas (`CourseMembership`).
4. **`activities`**: Actividades formativas (`PRACTICE`, `EXAM`, `ASSIGNMENT`), versionado inmutable (`ActivityVersion`), control de disponibilidad temporal (UTC), y autorización por clave segura hash (`AccessGrant`).
5. **`submissions`**: Registro inmutable del código entregado, canal de entrega (`WebSubmissionProvider`), y libro de intentos (`AttemptLedger`) con reserva transaccional.
6. **`evaluation`**: Cola de trabajos sobre PostgreSQL (`FOR UPDATE SKIP LOCKED`), comparadores de salida (`EXACT`, `TRIM`, `WHITESPACE_INSENSITIVE`, `LINE_INSENSITIVE`, `CASE_INSENSITIVE`, `NUMERIC_TOLERANCE`), motor de puntuación y generación de evaluaciones reproducibles.
7. **`audit`**: Registro inmutable de eventos operacionales (`AuditEvent`).
8. **`runner-api`**: Interfaz interna protegida por `RUNNER_TOKEN` para que el Runner reclame trabajos y devuelva resultados estructurados.

## 4. Inmutabilidad y Reproducibilidad

Toda evaluación histórica debe poder reproducirse en cualquier momento futuro. Para ello:
- Una `Submission` referencia obligatoriamente el `exercise_version_id` y el `activity_version_id` vigentes en `created_at`.
- Cada `ExerciseVersion` almacena el hash SHA-256 del contenido, el commit SHA origen, y la definición completa de los tests.
- Cada `Evaluation` almacena el digest real de la imagen Docker del runtime y la versión exacta del evaluador.
- Las reevaluaciones generan un nuevo registro `Evaluation` vinculado a la entrega existente, sin sobreescribir el histórico.

