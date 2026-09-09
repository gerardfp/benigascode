# Estrategia y Guía de Pruebas — CodeLab

## 1. Niveles de Pruebas

El sistema cuenta con cuatro niveles de verificación automatizada:

### A. Pruebas Unitarias
- **Dominio y Algoritmos:**
  - Evaluadores de salida: comparadores exactos (`ExactComparator`), con eliminación de espacios en blanco (`WhitespaceInsensitiveComparator`), insensibles a mayúsculas/minúsculas (`CaseInsensitiveComparator`), y con tolerancia de coma flotante (`NumericToleranceComparator`).
  - Motor de scoring: modelos proporcional (`ProportionalScoring`), ponderado por tests (`WeightedScoring`) y penalizaciones.
  - Parser de YAML: validación estricta de esquemas y detección de grafos acíclicos en colecciones (prevención de recursión infinita).
  - Generación determinista de hashes de contenido SHA-256.

### B. Pruebas de Integración (Spring Boot & PostgreSQL)
- **Migraciones Flyway:** Ejecución de migraciones desde cero sobre base de datos limpia.
- **Transaccionalidad en Entregas:**
  - Comprobación de que la creación de una entrega (`Submission`), la reserva atómica del intento (`AttemptLedger`) y la inserción del trabajo en la cola (`EvaluationJob`) se realizan en una transacción única. Si se agota el número de intentos, la entrega es rechazada antes de encolar.
- **Cola PostgreSQL con Concurrencia:**
  - Dos o más runners reclamando trabajos simultáneamente mediante `SELECT ... FOR UPDATE SKIP LOCKED`. Verificación de que ningún trabajo se procesa por duplicado.
  - Expiración de leases y reencolado automático de trabajos huérfanos.

### C. Pruebas de Seguridad y Autorización
- **Prevención de IDOR:**
  - Un alumno `studentA` no puede consultar la entrega ni los resultados de `studentB`.
  - Un alumno no puede consultar ni previsualizar tests privados bajo ninguna circunstancia.
  - Una clave de acceso expirada o revocada rechaza cualquier intento de autorización.
- **Pruebas de Seguridad del Runner:**
  - Intento de bucle infinito (`while(true) {}`): verificación de corte estricto por timeout.
  - Intento de consumo excesivo de memoria (`new byte[Integer.MAX_VALUE]`): captura de OOM en contenedor sin tumbar el daemon del runner.
  - Bomba fork: bloqueada por el límite de pids (`pids-limit 64`).
  - Salida infinita en stdout: truncada a los primeros 64KB para evitar desbordamiento de búfer.
  - Intento de acceso a red o metadatos de Oracle Cloud: bloqueado por `--network none`.

### D. Pruebas de Reproducibilidad Histórica
1. Se publica `ExerciseVersion 1` y `ActivityVersion 1`.
2. El alumno realiza una entrega #1, obteniendo una evaluación.
3. Posteriormente, el profesor publica `ExerciseVersion 2` (modificando tests) y `ActivityVersion 2`.
4. Se verifica que la entrega #1 continúa asociada a `ExerciseVersion 1` y `ActivityVersion 1`.
5. Se solicita una reevaluación de la entrega #1: la nueva evaluación se ejecuta contra los artefactos originales de la versión 1, preservando el histórico.

---

## 2. Ejecución de Tests

```bash
# Ejecutar todas las pruebas unitarias y de integración
mvn test

# Ejecutar suite específica de seguridad
mvn test -Dtest=*SecurityTest

# Ejecutar pruebas del sandbox del runner
python runner/tests/test_sandbox.py
```

