# CodeLab — Plataforma Educativa de Programación con Evaluación Automática

CodeLab es una plataforma diseñada para la práctica, seguimiento y evaluación automática de ejercicios de programación con retroalimentación inmediata para el alumnado y herramientas integrales de gestión docente para el profesorado.

El sistema se compone de un **Modular Monolith en Spring Boot** y un **Runner de Evaluación Aislado** que ejecuta código en sandboxes de Docker con restricciones estrictas de seguridad.

Diseñado y optimizado para despliegue en **Oracle Cloud Always Free (ARM64, 2 OCPU, 12 GB RAM)**.

---

## 1. Arquitectura

```text
                               INTERNET
                                  │
                                  ▼
                            CADDY REVERSE PROXY
                         (:80 / :443 HTTPS Let's Encrypt)
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
           FRONTEND SPA                     BACKEND MODULAR (/api/v1)
        (React + TypeScript)              (Spring Boot + Flyway + JPA)
                                                   │
                                                   ▼
                                             POSTGRESQL 18
                                                   │
                                                   │ (Cola SKIP LOCKED)
                                                   ▼
                                           RUNNER AGENT DAEMON
                                                   │
                                                   ▼
                                        SANDBOX DOCKER EVALUATOR
                                         (--network none, cap-drop ALL,
                                          read-only, tmpfs, cgroups)
```

---

## 2. Puesta en Marcha Rápida (Desarrollo)

### Requisitos
- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) v2.20+

### Pasos
1. Clonar el repositorio y copiar el archivo de variables de entorno:
   ```bash
   git clone <URL_REPOSITORIO> codelab
   cd codelab
   cp .env.example .env
   ```

2. Levantar los servicios de desarrollo:
   ```bash
   docker compose -f deployment/docker-compose.dev.yml up --build -d
   ```

3. Abrir en el navegador:
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
   - **Healthcheck:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)

### Credenciales de Prueba (Inicializadas en BD)
| Rol | Usuario | Contraseña |
|---|---|---|
| **Profesor** | `teacher@codelab.local` | `TeacherPass123!` |
| **Alumno** | `student@codelab.local` | `StudentPass123!` |
| **Administrador** | `admin@codelab.local` | `AdminPass123!` |

---

## 3. Flujo Principal de Aprendizaje (End-to-End)

1. **Profesor:** Inicia sesión, pulsa **"Sincronizar desde Git"** para cargar el ejercicio de ejemplo `calcular-media`.
2. **Profesor:** Genera una clave de acceso temporal para la colección en caso de ser privada.
3. **Alumno:** Inicia sesión, accede a la actividad asignada en su dashboard.
4. **Alumno:** Abre el editor de código, visualiza el enunciado y pulsa **"Probar Tests Públicos"** para ejecutar en sandbox sin consumir intentos.
5. **Alumno:** Pulsa **"Enviar Solución Oficial"**: la entrega se registra de forma inmutable, se consume un intento en el libro de registros (`AttemptLedger`) y entra en la cola de PostgreSQL.
6. **Runner:** Reclama el trabajo con `FOR UPDATE SKIP LOCKED`, ejecuta la compilación y los tests públicos y privados en un contenedor efímero aislado sin red.
7. **Resultado:** El alumno recibe inmediatamente la nota normalizada (0–100) y el desglose de resultados; el profesor puede consultar el historial y exportar a CSV.

---

## 4. Despliegue en Producción (Oracle Cloud ARM64)

El procedimiento completo paso a paso se encuentra documentado en:
👉 [docs/deployment-oracle.md](file:///c:/Users/gerard/Desktop/codecheck/docs/deployment-oracle.md)

Comando de arranque en producción:
```bash
docker compose -f deployment/docker-compose.prod.yml up -d
```

---

## 5. Documentación Técnica del Repositorio

- [Arquitectura del Sistema](file:///c:/Users/gerard/Desktop/codecheck/docs/architecture.md)
- [Especificación de la API REST](file:///c:/Users/gerard/Desktop/codecheck/docs/api.md)
- [Modelo de Base de Datos y Migraciones](file:///c:/Users/gerard/Desktop/codecheck/docs/database.md)
- [Formato y Validación de Contenidos Git](file:///c:/Users/gerard/Desktop/codecheck/docs/content-format.md)
- [Modelo y Análisis de Seguridad](file:///c:/Users/gerard/Desktop/codecheck/docs/security.md)
- [Guía de Pruebas Automatizadas](file:///c:/Users/gerard/Desktop/codecheck/docs/testing.md)
- [Registro de Decisiones de Arquitectura (ADRs)](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions.md)
  - [ADR-001: Modular Monolith](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions/ADR-001-modular-monolith.md)
  - [ADR-002: Cola de Evaluación en PostgreSQL](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions/ADR-002-postgresql-queue.md)
  - [ADR-003: Versionado Inmutable de Actividades](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions/ADR-003-activity-versioning.md)
  - [ADR-004: Aislamiento del Runner](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions/ADR-004-runner-isolation.md)
  - [ADR-005: Autenticación con Cookies HttpOnly](file:///c:/Users/gerard/Desktop/codecheck/docs/decisions/ADR-005-session-authentication.md)

