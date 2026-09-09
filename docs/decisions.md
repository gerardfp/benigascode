# Registro de Decisiones de Arquitectura — Benigascode

Este documento indexa y resume las decisiones técnicas y arquitectónicas tomadas durante el diseño e implementación de Benigascode, garantizando la trazabilidad respecto a `spec.md` y `master.md`.

## Índice de Decisiones (ADRs)

1. [ADR-001: Modular Monolith con Runner de Evaluación Aislado](file:///c:/Users/gerard/Desktop/benigascode/docs/decisions/ADR-001-modular-monolith.md)
   - Adopción de Modular Monolith en Spring Boot para minimizar consumo de memoria en Oracle Cloud Always Free (2 OCPU / 12 GB RAM) y garantizar transacciones ACID fiables.
2. [ADR-002: Cola de Evaluación Basada en PostgreSQL con FOR UPDATE SKIP LOCKED](file:///c:/Users/gerard/Desktop/benigascode/docs/decisions/ADR-002-postgresql-queue.md)
   - Implementación de cola asíncrona sobre PostgreSQL nativo con leases, fairness y reintentos, prescindiendo de Redis/RabbitMQ.
3. [ADR-003: Versionado Inmutable de Actividades (ActivityVersion)](file:///c:/Users/gerard/Desktop/benigascode/docs/decisions/ADR-003-activity-versioning.md)
   - Introducción de `ActivityVersion` para asegurar que las entregas históricas nunca se vean afectadas por cambios posteriores en intentos, feedback o fechas de una actividad.
4. [ADR-004: Aislamiento del Runner y Política de Sandbox](file:///c:/Users/gerard/Desktop/benigascode/docs/decisions/ADR-004-runner-isolation.md)
   - Aislamiento completo del código de los alumnos mediante contenedores efímeros con `--network none`, límites estrictos de CPU/RAM/procesos, filesystem de solo lectura y usuario sin privilegios.
5. [ADR-005: Autenticación Basada en Sesión con Cookies HttpOnly y Argon2id](file:///c:/Users/gerard/Desktop/benigascode/docs/decisions/ADR-005-session-authentication.md)
   - Eliminación del almacenamiento de JWT en localStorage para mitigar XSS; uso de sesiones seguras por cookie HttpOnly y hashing Argon2id.

## Principio de Resolución de Conflictos
Si existiese una aparente contradicción entre la especificación funcional y la arquitectura técnica, se resuelve bajo la siguiente jerarquía estricta:
1. Seguridad;
2. Integridad de datos;
3. Reproducibilidad;
4. Requisitos funcionales de `spec.md`;
5. Decisiones arquitectónicas de `master.md`;
6. Simplicidad y mantenibilidad.

