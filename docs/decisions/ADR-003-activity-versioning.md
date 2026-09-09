# ADR-003: Versionado Inmutable de Actividades (ActivityVersion)

## Estado
Aceptado

## Contexto
En `spec.md`, se define el versionado de ejercicios (`ExerciseVersion`) pero la entidad `Activity` se modelaba inicialmente como mutable. Como se identifica críticamente en `master.md` (apartados 14 y 15), una actividad docente puede modificar a lo largo del tiempo:
- el número de intentos permitidos (p. ej. de 1 intento en examen a 3 en recuperación);
- la política de feedback (ocultar/mostrar tests y outputs esperados);
- las fechas y reglas de disponibilidad;
- las versiones de ejercicios asociadas y sus ponderaciones de puntuación.

Si una actividad cambiara después de que un alumno realizó una entrega, la reinterpretación histórica de esa entrega rompería el principio fundamental de reproducibilidad académica e inmutabilidad.

## Decisión
Introducir formalmente la entidad inmutable `ActivityVersion`:
1. `Activity` actúa como identidad administrativa estable (slug, nombre, curso).
2. Toda modificación operativa o de configuración sobre una actividad genera una nueva fila `ActivityVersion`.
3. Una entrega (`Submission`) se vincula de forma obligatoria e inmutable a:
   - `activity_version_id`
   - `exercise_version_id`
4. La validez de la entrega y el consumo de intentos se evalúa siempre frente a la `ActivityVersion` vigente en el momento de la entrega (`submission.created_at`).

## Consecuencias
- **Positivas:**
  - Garantía absoluta de reproducibilidad en auditorías académicas.
  - El profesor puede actualizar reglas o ejercicios para futuras entregas sin corromper ni reevaluar erróneamente entregas pasadas.
- **Negativas:**
  - Requiere lógica de generación de versiones en el backend para actividades.

