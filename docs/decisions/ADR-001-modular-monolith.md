# ADR-001: Modular Monolith con Runner de Evaluación Aislado

## Estado
Aceptado

## Contexto
Benigascode es una plataforma educativa para la realización, seguimiento y evaluación automática de ejercicios de programación. El sistema está dimensionado inicialmente para soportar ~50 alumnos concurrentes y ~7 entregas/minuto, desplegado en Oracle Cloud Free Tier (2 OCPU, 12 GB RAM, ARM64).

Se requería decidir la arquitectura del backend para satisfacer los requerimientos funcionales de desacoplamiento de capas (`Content`, `Learning`, `Submission`, `Queue`, `Evaluation`, `Results`) sin incurrir en la sobrecarga operativa, consumo de memoria y complejidad de una arquitectura de microservicios distribuida.

## Decisión
Implementar el backend de Benigascode como un **Modular Monolith** estructurado por dominios explícitos dentro de un único proceso Spring Boot, complementado con un **Runner Agent Aislado** desacoplado para la ejecución segura del código de los alumnos:

1. **Módulos funcionales del backend:**
   - `identity`: Usuarios, roles, autenticación segura por sesión/cookie HttpOnly y autorización.
   - `content`: Ejercicios, colecciones, versiones inmutables, parser de contenidos y validación.
   - `learning`: Cursos, grupos y matrículas.
   - `activities`: Actividades, versionado de actividades (`ActivityVersion`), disponibilidad y claves de acceso.
   - `submissions`: Recepción inmutable de entregas, reserva atómica de intentos.
   - `evaluation`: Cola transaccional de trabajos, comparadores, scoring y registros de evaluación.
   - `audit`: Trazabilidad y auditoría de eventos (`AuditEvent`).
   - `runner-api`: Endpoints internos protegidos para comunicación con los agentes de ejecución.

2. **Aislamiento del Runner:**
   El runner se ejecuta como un proceso/servicio separado sin credenciales a PostgreSQL ni a GitHub, reclamando trabajos mediante una interfaz interna controlada.

## Consecuencias
- **Positivas:**
  - Consumo mínimo de memoria (ideal para los 12 GB de RAM de Oracle Free Tier).
  - Transaccionalidad ACID nativa entre módulos (p. ej., reserva de intento y creación de submission en una única transacción).
  - Simplicidad operativa (un único artefacto JAR y base de datos).
  - Preparado para separar el runner físicamente en una segunda VM sin alterar el dominio.
- **Negativas:**
  - Requiere disciplina estricta de diseño para evitar acoplamientos no deseados entre módulos en el código fuente.

