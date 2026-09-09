# ADR-002: Cola de Evaluación Basada en PostgreSQL con FOR UPDATE SKIP LOCKED

## Estado
Aceptado

## Contexto
Las entregas de código realizadas por los alumnos deben evaluarse de forma asíncrona mediante una cola de trabajos (`EvaluationJob`), permitiendo absorber picos de tráfico, reintentar fallos de infraestructura y garantizar equidad (fairness).
Se evaluó introducir brokers de mensajería externos como Redis, RabbitMQ o Kafka, frente a utilizar PostgreSQL nativo.

## Decisión
Implementar la cola de evaluación directamente sobre PostgreSQL utilizando la tabla `evaluation_jobs` y la instrucción:
```sql
SELECT ... FROM evaluation_jobs
WHERE status = 'QUEUED' AND available_at <= NOW()
ORDER BY priority DESC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```
Complementado con:
- **Leases de trabajo:** Cada trabajo reclamado tiene un `lease_until`. Si el runner falla o se apaga, el lease expira y un proceso supervisor reencola el trabajo automáticamente.
- **Fairness MVP:** Límite de máximo 1 evaluación activa concurrente por alumno.
- **Idempotencia:** Cada trabajo tiene un `token` y `evaluation_id` para evitar ejecuciones o resultados duplicados.

## Consecuencias
- **Positivas:**
  - Cero dependencias adicionales de infraestructura (sin Redis/RabbitMQ/Kafka).
  - Transaccionalidad garantizada entre la creación de la entrega (`Submission`) y la encolación del trabajo (`EvaluationJob`).
  - Perfecta adecuación a los recursos conservadores de Oracle Free Tier.
- **Negativas:**
  - Menor throughput teórico que un broker en memoria, pero sobradamente suficiente para el escenario objetivo de ~7 entregas/minuto y picos de 50 entregas.

