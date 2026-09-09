# CodeLab — Especificación funcional v0.2

## 1. Concepto general

CodeLab es una plataforma para la realización, seguimiento y evaluación automática de ejercicios de programación.

Su objetivo es proporcionar al alumnado un entorno para practicar programación y recibir retroalimentación inmediata, y al profesorado una herramienta para crear, organizar, distribuir, evaluar y analizar actividades de programación.

El sistema tendrá tres actores principales:

* **Alumno**: consulta las actividades que tiene disponibles, realiza ejercicios, envía soluciones y consulta su progreso.
* **Profesor**: administra cursos, grupos, colecciones, actividades, alumnos y resultados.
* **Sistema CodeLab**: sincroniza contenidos, gestiona entregas, ejecuta las soluciones, realiza las evaluaciones y registra los resultados.

Los **contenidos docentes se almacenan en un repositorio privado de GitHub propiedad del profesor**. CodeLab sincroniza dichos contenidos, pero el alumno nunca tiene acceso directo al repositorio de contenidos.

El sistema deberá separar claramente:

```text
CONTENIDOS
    ↓
APRENDIZAJE
    ↓
ENTREGA
    ↓
EVALUACIÓN
    ↓
RESULTADOS
```

La forma en que el alumno entrega una solución no deberá condicionar el sistema de evaluación.

---

# 2. Modelo conceptual

El modelo conceptual principal será:

```text
Curso
  │
  ├── Grupo
  │     ├── Alumno
  │     └── Alumno
  │
  └── Actividad
         │
         └── Colección
                │
                └── Ejercicio
                       │
                       └── Versión
                              │
                              └── Tests
```

Las entregas se relacionarán con una actividad y con una versión concreta del ejercicio:

```text
Alumno
   │
   ▼
Actividad
   │
   ▼
Ejercicio
   │
   ▼
Versión del ejercicio
   │
   ▼
Entrega
   │
   ▼
Evaluación
   │
   ├── Test 1
   ├── Test 2
   ├── Test 3
   └── ...
```

---

# 3. Ejercicio

Un **ejercicio** es una unidad básica evaluable.

Contendrá conceptualmente:

* identificador
* título
* descripción
* enunciado
* lenguaje
* dificultad
* etiquetas
* ejemplos
* material adicional
* configuración de compilación
* configuración de ejecución
* tests públicos
* tests privados
* criterios de evaluación
* configuración de puntuación
* configuración de intentos
* configuración de entrega
* configuración de feedback

El ejercicio será un concepto lógico estable.

Los cambios en su contenido generarán nuevas versiones.

---

# 4. Versionado de ejercicios

Los ejercicios deberán estar versionados.

Por ejemplo:

```text
Ejercicio:
    calcular-media

Versión:
    v1
    v2
    v3
```

Una versión deberá contener todos los elementos necesarios para reproducir una evaluación:

```text
ExerciseVersion
├── enunciado
├── ejemplos
├── configuración compilación
├── configuración ejecución
├── tests públicos
├── tests privados
├── comparadores
└── configuración puntuación
```

Una entrega deberá quedar asociada a una **versión concreta del ejercicio**.

Por tanto, si el profesor modifica un test posteriormente:

```text
Entrega #25
    → ejercicio v2

Entrega #31
    → ejercicio v3
```

La evaluación histórica de la entrega #25 no deberá cambiar.

El sistema nunca deberá reevaluar una entrega histórica utilizando automáticamente la versión actual del ejercicio.

---

# 5. Estado del contenido

Los ejercicios podrán encontrarse en diferentes estados:

```text
BORRADOR
    ↓
VALIDADO
    ↓
PUBLICADO
```

También podrán quedar:

```text
ARCHIVADO
```

La existencia de un ejercicio en GitHub no implica que esté disponible para ningún alumno.

Una colección también podrá tener diferentes estados:

```text
BORRADOR
    ↓
PUBLICADA
    ↓
ARCHIVADA
```

Un ejercicio podrá estar validado pero no publicado.

Esto permitirá al profesor preparar y comprobar una colección completa antes de ponerla a disposición del alumnado.

---

# 6. Colecciones

Una **colección** es un conjunto organizado de ejercicios.

Ejemplo:

```text
Java — Arrays básicos
```

Puede contener ejercicios de diferentes dificultades.

Una colección tendrá:

* identificador
* nombre
* descripción
* lenguaje o lenguajes
* dificultad orientativa
* etiquetas
* ejercicios
* orden de los ejercicios
* estado
* visibilidad
* versión
* configuración de disponibilidad

---

# 7. Colecciones anidadas

Una colección podrá incorporar otras colecciones.

Ejemplo:

```text
Estructuras de Datos
│
├── Arrays
│
├── Diccionarios
│
└── Listas
```

De esta forma, un ejercicio añadido posteriormente a `Arrays` podrá aparecer automáticamente en `Estructuras de Datos` si la relación está configurada como enlazada.

Habrá dos modalidades principales.

### 7.1. Colección enlazada

La colección incorpora otra colección como referencia:

```text
Estructuras de Datos
    └── → Arrays
```

Los cambios posteriores de `Arrays` se reflejarán automáticamente.

### 7.2. Ejercicios seleccionados

El profesor podrá seleccionar individualmente determinados ejercicios de otra colección:

```text
Estructuras de Datos
    ├── Arrays → ejercicio 1
    ├── Arrays → ejercicio 4
    └── Arrays → ejercicio 7
```

Los cambios posteriores en la colección original no deberán modificar automáticamente la selección.

---

# 8. Versionado de colecciones

Cuando sea necesario preservar exactamente el contenido utilizado en una actividad, una colección podrá utilizar una versión concreta.

Deberá contemplarse la diferencia entre:

```text
LINKED
```

y:

```text
SNAPSHOT
```

### LINKED

La colección utiliza el contenido actual de la colección referenciada.

### SNAPSHOT

La colección conserva la composición existente en el momento de crear la versión.

Esto permitirá, por ejemplo, que un examen de junio siga utilizando exactamente los ejercicios que tenía cuando fue creado aunque posteriormente el profesor modifique la colección original.

El sistema deberá impedir ciclos:

```text
A → B → C → A
```

---

# 9. Orden y composición de las colecciones

El profesor podrá establecer el orden de los ejercicios.

Cada ejercicio podrá tener:

* posición
* obligatorio/opcional
* normal/bonus
* peso dentro de la colección

En el futuro podrán añadirse prerrequisitos o desbloqueo progresivo de ejercicios.

---

# 10. Curso

Un **curso** representa un contexto docente.

Ejemplo:

```text
1DAM — Programación — 2026/27
```

Un curso tendrá:

* nombre
* descripción
* curso académico
* profesor/es
* grupos
* alumnos
* actividades
* colecciones asociadas

---

# 11. Grupos

Un curso podrá contener varios grupos.

```text
1DAM — Programación
│
├── Grupo A
├── Grupo B
└── Grupo C
```

Un alumno podrá pertenecer a uno o varios grupos según las necesidades del sistema.

Esto permitirá, por ejemplo:

* diferentes actividades por grupo
* diferentes fechas
* diferentes colecciones
* diferentes configuraciones de evaluación
* grupos de recuperación
* grupos de refuerzo

---

# 12. Actividad / Assignment

Se introduce explícitamente el concepto de **Actividad**.

Una actividad representa el uso concreto de un ejercicio o colección dentro de un contexto docente.

Esto permite que el mismo ejercicio pueda utilizarse de diferentes maneras.

Por ejemplo:

```text
Ejercicio:
    Ordenar un array
```

puede utilizarse como:

```text
Actividad A
    Práctica
    10 intentos
    Feedback completo

Actividad B
    Examen
    1 intento
    Sin GitHub
    Feedback limitado
```

La actividad podrá estar asociada a:

* curso
* grupo
* colección
* ejercicio
* versión concreta del ejercicio

---

# 13. Modalidades de actividad

Deberán contemplarse al menos:

```text
PRACTICE
EXAM
ASSIGNMENT
```

La modalidad no deberá crear diferentes tipos de ejercicio.

Será una configuración de la actividad.

---

# 14. Disponibilidad

La disponibilidad determina cuándo y para quién puede utilizarse una actividad o colección.

Podrán configurarse:

* fecha/hora de apertura
* fecha/hora de cierre
* fecha límite de entrega
* zona horaria

Ejemplo:

```text
Disponible:
    10/09/2026 08:00

Cierre:
    20/09/2026 23:59
```

El sistema almacenará internamente las fechas en UTC.

La interfaz utilizará la zona horaria configurada, inicialmente:

```text
Europe/Madrid
```

---

# 15. Visibilidad de colecciones

CodeLab **no tendrá un catálogo global de ejercicios visible para el alumno**.

No deberá existir una operación equivalente a:

```text
GET /api/exercises
```

que permita al alumno descubrir todos los ejercicios del sistema.

La navegación será:

```text
Alumno
   ↓
Colecciones disponibles
   ↓
Ejercicios
   ↓
Actividad
   ↓
Entrega
```

La existencia de un ejercicio en CodeLab no implica que el alumno pueda saber que existe.

---

# 16. Colecciones públicas

Una colección podrá publicarse como pública.

Una colección pública podrá ser descubierta por los usuarios según la configuración del sistema.

No necesitará una clave de acceso.

Sin embargo, para realizar entregas el usuario deberá disponer de una cuenta CodeLab.

---

# 17. Colecciones privadas mediante clave

El profesor podrá crear colecciones privadas accesibles mediante una clave.

Ejemplo:

```text
Examen Arrays — Grupo A

Clave:
ABC-72F-X9
```

El alumno introducirá la clave.

```text
Alumno
   ↓
Introduce clave
   ↓
CodeLab valida
   ↓
Se crea autorización
   ↓
Colección aparece en "Mis colecciones"
```

La clave:

* no formará parte de la URL
* se transmitirá mediante HTTPS
* no deberá almacenarse en texto plano
* no dará acceso al repositorio de GitHub
* no dará acceso a tests privados
* no dará acceso a otras colecciones

La autorización resultante quedará registrada.

---

# 18. Asignación directa

Además de las colecciones públicas y las claves, una colección o actividad podrá asignarse directamente a:

* un curso
* un grupo
* un alumno concreto

Por tanto, existirán tres mecanismos conceptuales:

```text
PÚBLICA
ASIGNADA
CLAVE
```

Un alumno podrá tener acceso a una colección por más de un mecanismo.

---

# 19. Separación entre visibilidad y autorización

La aplicación no deberá confiar únicamente en ocultar elementos de la interfaz.

Cada petición deberá comprobar en servidor que el alumno está autorizado.

Por ejemplo:

```text
GET /api/collections/123
```

deberá comprobar:

```text
¿El alumno tiene acceso a la colección 123?
```

Lo mismo deberá aplicarse a:

* ejercicios
* actividades
* tests públicos
* entregas
* resultados
* archivos
* cualquier otro recurso

---

# 20. Tests públicos y privados

Los tests se dividirán en:

```text
tests/
├── public/
└── private/
```

Los tests públicos podrán ser utilizados por el alumno para comprobar su solución.

Los tests privados únicamente podrán ser utilizados por el sistema de evaluación.

El alumno nunca podrá descargar los tests privados.

Los tests privados tampoco deberán estar presentes en ningún repositorio que el alumno pueda modificar.

---

# 21. Ejemplos y tests públicos

Los ejemplos del enunciado y los tests públicos serán conceptos diferentes.

```text
examples/
public_tests/
private_tests/
```

Los ejemplos servirán para explicar el funcionamiento del ejercicio.

Los tests públicos servirán para validar la solución.

---

# 22. Versión de los tests públicos

Los tests públicos deberán estar versionados junto con el ejercicio.

Si el profesor cambia los tests:

```text
Ejercicio v2
Tests públicos v2
```

El alumno deberá poder obtener siempre la versión correspondiente a la actividad que está realizando.

Esto será especialmente importante para la ejecución local de tests.

No deberá producirse una situación en la que:

```text
Tests locales → versión antigua

Tests CodeLab → versión nueva
```

sin que el sistema pueda detectarlo.

---

# 23. Comparación de resultados

Los ejercicios podrán definir diferentes mecanismos de comparación.

Como mínimo deberán contemplarse:

```text
EXACT
TRIM
WHITESPACE_INSENSITIVE
LINE_INSENSITIVE
CASE_INSENSITIVE
NUMERIC_TOLERANCE
```

También podrá contemplarse posteriormente:

```text
CUSTOM
JUNIT
```

La comparación deberá formar parte de la versión del ejercicio.

---

# 24. Configuración de compilación

Cada ejercicio deberá definir cómo se compila.

Ejemplo:

```text
language: java
version: 21
compile:
    javac ...
```

Deberán poder especificarse:

* versión del lenguaje
* compilador
* parámetros
* dependencias
* estructura del proyecto
* comando de compilación

---

# 25. Configuración de ejecución

El ejercicio podrá definir:

* comando de ejecución
* argumentos
* variables de entorno permitidas
* timeout
* memoria
* CPU
* número máximo de procesos
* tamaño máximo de salida

---

# 26. Runtime / Toolchain

La plataforma deberá separar el ejercicio de la infraestructura concreta que lo ejecuta.

Por ejemplo:

```text
Java 17
Java 21
Java 25
```

Cada entorno deberá estar versionado.

Conceptualmente:

```text
Runtime
    ↓
Docker image
    ↓
Compiler / JDK
    ↓
Runner
```

Una evaluación histórica deberá poder identificar el runtime utilizado.

---

# 27. Entrega

Una **Submission** representa una entrega de una solución.

Podrá proceder de:

```text
WEB
GITHUB
```

En el futuro podrían añadirse otros mecanismos.

Todos terminarán en el mismo flujo:

```text
Submission
    ↓
Queue
    ↓
Evaluation
```

La forma de entrega estará desacoplada de la evaluación.

---

# 28. Código de una entrega

Cada entrega deberá conservar el código evaluado.

El sistema deberá poder identificar:

* contenido
* lenguaje
* versión del ejercicio
* actividad
* alumno
* fecha
* origen de la entrega

La entrega será inmutable.

---

# 29. Qué constituye un intento

El sistema deberá distinguir entre:

### Error del alumno

Por ejemplo:

* código que no compila
* test incorrecto
* timeout causado por el programa
* excepción durante la ejecución

Puede consumir un intento.

### Error del sistema

Por ejemplo:

* fallo del runner
* caída del servicio
* error interno
* pérdida de comunicación

No deberá consumir un intento.

La política concreta podrá configurarse por actividad.

---

# 30. Modalidad de envío

Una actividad podrá utilizar:

```text
AUTO_SUBMIT
```

o:

```text
EXPLICIT_SUBMIT
```

### AUTO_SUBMIT

Cada push o envío genera automáticamente una entrega.

### EXPLICIT_SUBMIT

El alumno puede guardar/probar código y debe realizar una acción explícita para generar la entrega oficial.

Esto será especialmente útil para diferenciar:

```text
prueba
```

de:

```text
intento oficial
```

---

# 31. Reintentos

El profesor podrá configurar:

```text
SIN_REINTENTOS
```

o:

```text
N_INTENTOS
```

o:

```text
ILIMITADOS
```

Ejemplo:

```text
Examen:
    intentos = 1

Práctica:
    intentos = ilimitados
```

El límite se aplicará a la actividad, no necesariamente al ejercicio global.

---

# 32. Fechas y reintentos

El sistema deberá controlar conjuntamente:

* fecha de apertura
* fecha de cierre
* número de intentos
* método de entrega
* actividad
* permisos

Por ejemplo:

```text
Examen
09:00 — 11:00
1 intento
GitHub desactivado
Web obligatoria
```

---

# 33. Estado de una entrega

Una entrega podrá encontrarse en estados como:

```text
PENDIENTE
   ↓
EN_COLA
   ↓
EVALUANDO
   ↓
FINALIZADA
```

El resultado podrá clasificarse como:

```text
CORRECTA
INCORRECTA
ERROR_COMPILACION
TIMEOUT
ERROR_EJECUCION
ERROR_SISTEMA
CANCELADA
```

Se deberá distinguir claramente entre:

```text
programa incorrecto
```

y:

```text
fallo de infraestructura
```

---

# 34. Evaluación

Una entrega podrá tener una o varias evaluaciones.

Esto permitirá reevaluaciones posteriores sin modificar la entrega original.

```text
Submission #25
    │
    ├── Evaluation #1
    ├── Evaluation #2
    └── Evaluation #3
```

Cada evaluación deberá conservar:

* versión del ejercicio
* versión de tests
* runtime
* fecha
* resultados
* puntuación
* motivo de reevaluación

---

# 35. Reevaluación

El profesor podrá solicitar una reevaluación cuando sea necesario.

Por ejemplo:

* corrección de un test
* corrección de un comparador
* corrección del runner
* modificación de una regla de evaluación

La nueva evaluación no deberá borrar la anterior.

Deberá existir un historial.

---

# 36. Evaluación por tests

Un ejercicio podrá tener, por ejemplo:

```text
10 tests

3 públicos
7 privados
```

Cada test podrá tener un peso.

Ejemplo:

```text
Tests públicos: 30 %
Tests privados: 70 %
```

También podrán existir tests con pesos individuales.

---

# 37. Reglas de puntuación

El profesor podrá configurar diferentes modelos:

### Proporcional

```text
8/10 tests → 8/10
```

### Tests obligatorios

Algunos tests deberán superarse obligatoriamente.

### Pesos

```text
Test 1 → 10 %
Test 2 → 20 %
Test 3 → 70 %
```

### Penalizaciones

Podrán existir penalizaciones configurables.

La puntuación interna se almacenará preferentemente en una escala numérica normalizada, por ejemplo:

```text
0–100
```

La presentación podrá transformarse posteriormente:

```text
80/100 → 8/10
```

---

# 38. Resultado de cada test

Cada test deberá registrar al menos:

* estado
* tiempo
* salida
* mensaje de error cuando corresponda
* puntuación obtenida

El nivel de información mostrado al alumno será configurable.

Por ejemplo:

```text
✓ Test 1
✓ Test 2
✗ Test 3

Esperado:
42

Obtenido:
41
```

En determinados ejercicios el profesor podrá ocultar información sensible.

---

# 39. Feedback

El sistema deberá diferenciar entre:

```text
RESULTADO
```

y:

```text
FEEDBACK
```

El feedback podrá incluir:

* compilación correcta/incorrecta
* tests superados
* tests fallidos
* salida esperada
* salida obtenida
* errores de compilación
* timeout
* errores de ejecución

Posteriormente podrán añadirse reglas de feedback automático.

---

# 40. Pruebas públicas antes de entregar

El alumno podrá ejecutar los tests públicos antes de realizar una entrega oficial.

Esto deberá estar disponible tanto desde la web como, posteriormente, desde GitHub.

Flujo:

```text
Código
   ↓
Pruebas públicas
   ↓
Feedback inmediato
   ↓
Corrección
   ↓
Entrega oficial
```

Las pruebas preliminares no deberán consumir un intento oficial salvo que la actividad esté explícitamente configurada para ello.

---

# 41. Ejecución local de tests

Para GitHub, CodeLab podrá proporcionar los tests públicos para ejecución local.

Por ejemplo:

```text
codelab test
```

o mediante una estructura de proyecto preparada.

Los tests deberán identificar claramente la versión utilizada.

El alumno deberá poder actualizar los tests cuando exista una nueva versión.

---

# 42. Historial de entregas

El alumno podrá consultar el historial:

```text
Ejercicio: Buscar el máximo

Entrega     Fecha       Resultado
──────────────────────────────────
#12         14:32       10/10
#11         14:28        8/10
#10         14:21        6/10
#9          14:14        Error
```

Cada entrega será inmutable.

Esto permitirá analizar:

* número de intentos
* evolución
* tiempo entre entregas
* puntuaciones
* primer intento correcto
* último intento
* número de errores
* tiempo hasta resolver

---

# 43. Estado de progreso

No deberá utilizarse únicamente una métrica como:

```text
8 / 12 ejercicios
```

El sistema deberá distinguir, al menos:

```text
NO_INICIADO
EN_PROGRESO
INTENTADO
APROBADO
DOMINADO
```

La diferencia entre **aprobado** y **dominado** podrá utilizarse posteriormente para el sistema de aprendizaje.

---

# 44. Puntuación de ejercicio, colección y actividad

Deberán distinguirse:

```text
Puntuación del ejercicio
       ↓
Puntuación de la actividad
       ↓
Puntuación de la colección
       ↓
Puntuación del curso
```

Una colección podrá utilizar diferentes pesos para sus ejercicios.

Una actividad podrá tener una ponderación diferente respecto al curso.

Esto evitará mezclar directamente:

```text
"ha resuelto el ejercicio"
```

con:

```text
"ha obtenido un 8 en la evaluación"
```

---

# 45. GitHub como mecanismo de entrega

GitHub será un mecanismo de entrega opcional.

Inicialmente CodeLab podrá funcionar únicamente mediante web.

Posteriormente podrá conectarse el repositorio del alumno.

Arquitectura:

```text
Web ──────────────┐
                  │
GitHub ───────────┼──→ Submission
                  │
Otros ───────────┘
                       ↓
                     Queue
                       ↓
                     Judge
```

---

# 46. Repositorio GitHub del alumno

Al conectar GitHub, CodeLab podrá crear una estructura de ejercicios:

```text
codelab/
├── ejercicio-1/
├── ejercicio-2/
├── ejercicio-3/
└── ...
```

Cada ejercicio podrá contener el código correspondiente.

La estructura concreta deberá formar parte del contrato de integración.

---

# 47. Push como entrega

Un push podrá generar automáticamente una entrega cuando la actividad lo permita.

Ejemplo:

```text
Alumno
   ↓
git push
   ↓
GitHub
   ↓
CodeLab
   ↓
Submission
   ↓
Queue
   ↓
Judge
```

La entrega deberá quedar asociada al commit exacto que la originó.

---

# 48. Identificación de commits

Toda entrega procedente de GitHub deberá almacenar:

* repositorio
* propietario
* rama
* commit SHA
* fecha del commit
* fecha de recepción por CodeLab

CodeLab evaluará siempre el **commit exacto**, nunca simplemente el estado actual de la rama.

Esto evitará que una evaluación histórica cambie porque posteriormente el alumno haya realizado otro push.

---

# 49. Configuración de GitHub por actividad

El profesor podrá habilitar o deshabilitar GitHub por actividad.

Ejemplo:

```text
Práctica:
    Web ✓
    GitHub ✓

Examen:
    Web ✓
    GitHub ✗
```

También podrá configurarse:

```text
AUTO_SUBMIT
EXPLICIT_SUBMIT
```

independientemente del canal.

---

# 50. Integración GitHub: seguridad

El repositorio del alumno deberá considerarse un entorno controlado por el alumno.

No se deberán almacenar en él:

* secretos de CodeLab
* credenciales GitHub del profesor
* tests privados
* credenciales de la base de datos
* tokens de administración

El sistema no deberá confiar en workflows modificables por el alumno para proteger secretos.

La integración deberá utilizar mecanismos de GitHub apropiados para recibir eventos y acceder únicamente a la información necesaria.

---

# 51. GitHub del profesor

El profesor dispondrá de un repositorio privado de contenidos:

```text
codelab-exercises
```

Ejemplo conceptual:

```text
codelab-exercises/
│
├── collections/
│
├── exercises/
│
├── runtimes/
│
└── ...
```

La estructura exacta se definirá posteriormente.

CodeLab tendrá acceso de lectura al repositorio.

---

# 52. GitHub como fuente de contenidos

GitHub será la fuente de verdad de:

* enunciados
* ejercicios
* tests
* configuración de ejecución
* configuración de compilación
* ejemplos
* metadatos docentes

La base de datos de CodeLab contendrá la información necesaria para:

* búsquedas internas
* relaciones
* usuarios
* cursos
* actividades
* permisos
* entregas
* resultados
* progreso
* configuración operativa

---

# 53. Sincronización de contenidos

El flujo será:

```text
Profesor
   ↓
git push
   ↓
GitHub
   ↓
CodeLab
   ↓
Validación
   ↓
Importación
   ↓
Nueva versión
   ↓
Publicación
```

La sincronización podrá realizarse mediante:

* webhook
* sincronización periódica
* sincronización manual

---

# 54. Importación atómica

Una sincronización incorrecta no deberá destruir el contenido actualmente publicado.

Por ejemplo:

```text
Versión publicada: v5

GitHub:
    v6 → ERROR
```

CodeLab deberá conservar:

```text
v5 → publicada
v6 → inválida
```

y mostrar el error al profesor.

No deberá producirse una actualización parcial de la plataforma.

---

# 55. Validación del repositorio

CodeLab deberá validar:

* estructura
* sintaxis de configuración
* referencias
* ejercicios
* tests
* colecciones
* ciclos de colecciones
* runtimes
* comandos
* comparadores

Los errores deberán aparecer en el panel del profesor.

---

# 56. Publicación

Crear un ejercicio en GitHub no implica publicarlo.

El profesor podrá utilizar un flujo como:

```text
GitHub
   ↓
Importado
   ↓
Validado
   ↓
Preparado
   ↓
Publicado
```

La publicación deberá generar una versión identificable.

---

# 57. Contenido frente a configuración docente

Se separarán dos conceptos.

### GitHub

Contendrá:

* contenido del ejercicio
* tests
* configuración técnica
* material docente

### CodeLab

Gestionará:

* cursos
* grupos
* alumnos
* actividades
* fechas
* asignaciones
* permisos
* intentos
* resultados
* progreso

Esto permitirá reutilizar un ejercicio en múltiples cursos sin duplicar su contenido.

---

# 58. Profesor

El profesor dispondrá de un panel de administración.

Podrá consultar:

```text
Cursos
Grupos
Alumnos
Colecciones
Ejercicios
Actividades
Entregas
Evaluaciones
Resultados
Estadísticas
Sincronizaciones
```

Los contenidos de los ejercicios se modificarán principalmente en GitHub.

---

# 59. Gestión de cursos y grupos

El profesor podrá:

* crear cursos
* editar cursos
* crear grupos
* matricular alumnos
* eliminar alumnos
* mover alumnos entre grupos
* asignar actividades
* establecer fechas
* consultar resultados

Inicialmente podrá existir importación de alumnos mediante CSV.

Posteriormente podrán estudiarse:

* Moodle
* Google
* Microsoft
* LDAP
* sistemas del centro

---

# 60. Gestión de actividades

El profesor podrá:

* crear actividades
* asignarlas
* establecer fechas
* establecer intentos
* establecer modo de entrega
* activar/desactivar GitHub
* configurar puntuación
* configurar feedback
* cerrar actividades
* reabrir actividades
* realizar reevaluaciones

---

# 61. Resultados del profesor

El profesor podrá consultar resultados individuales y globales.

Ejemplo:

```text
Alumno       Ejercicios   Aprobados   Media
------------------------------------------------
Alumno 1        12            10        8,4
Alumno 2        12             7        6,2
Alumno 3        12            12        9,5
```

El profesor podrá acceder al detalle de cada entrega.

---

# 62. Exportación

El sistema deberá permitir exportar información.

Inicialmente:

```text
CSV
```

Posteriormente:

```text
XLSX
JSON
```

Podrán exportarse:

* alumnos
* actividades
* entregas
* puntuaciones
* resultados
* progreso

---

# 63. Revisión manual

No todos los aspectos de una actividad tienen por qué ser evaluables automáticamente.

El sistema deberá contemplar posteriormente:

```text
Evaluación automática
+
Evaluación manual
```

Una entrega podrá recibir:

* puntuación automática
* puntuación manual
* comentarios del profesor

El historial de modificaciones deberá conservarse.

---

# 64. Auditoría

El sistema deberá registrar acontecimientos importantes.

Ejemplos:

```text
Profesor publicó colección
Profesor modificó actividad
Alumno obtuvo acceso mediante clave
Alumno realizó entrega
Sistema ejecutó evaluación
Profesor reevaluó entrega
```

Cada evento deberá contener, cuando corresponda:

* usuario
* acción
* fecha/hora
* recurso afectado
* información necesaria para auditoría

---

# 65. Permisos del alumno

El alumno podrá:

* ver sus colecciones
* ver sus actividades
* acceder a sus ejercicios
* descargar material público
* ejecutar tests públicos
* enviar soluciones
* consultar sus resultados
* consultar su historial
* consultar su progreso
* conectar su GitHub si está habilitado

No podrá:

* listar todos los ejercicios
* listar todas las colecciones privadas
* acceder a tests privados
* acceder al repositorio del profesor
* modificar ejercicios
* modificar colecciones
* consultar resultados de otros alumnos
* modificar puntuaciones
* acceder a entregas ajenas

---

# 66. Permisos del profesor

El profesor podrá:

* gestionar cursos
* gestionar grupos
* gestionar alumnos
* asignar actividades
* gestionar acceso
* consultar resultados
* consultar estadísticas
* publicar/despublicar contenido
* sincronizar GitHub
* solicitar reevaluaciones
* revisar entregas
* exportar resultados

Los profesores solo deberán acceder a los cursos y alumnos que tengan autorizados.

---

# 67. Identidad y autenticación

Cada alumno tendrá una cuenta CodeLab.

Como mínimo:

```text
Usuario
├── identificador
├── nombre
├── email
└── estado
```

La autenticación concreta podrá ser:

* usuario/contraseña
* Google
* Microsoft
* GitHub
* sistema del centro

La arquitectura deberá permitir cambiar posteriormente el mecanismo de autenticación sin modificar el modelo de aprendizaje.

---

# 68. Seguridad de las claves

Las claves de acceso de colecciones deberán almacenarse de forma segura.

El sistema no deberá necesitar recuperar la clave original para validar una entrada.

Deberá contemplarse:

* caducidad
* revocación
* regeneración
* límite de intentos
* auditoría

---

# 69. Seguridad de ejecución

El código del alumno deberá considerarse **potencialmente malicioso**.

Nunca deberá ejecutarse directamente en el proceso de la aplicación.

La arquitectura mínima será:

```text
API
 │
 ▼
Queue
 │
 ▼
Runner
 │
 ▼
Sandbox
```

---

# 70. Sandbox

Cada ejecución deberá realizarse de forma aislada.

Como mínimo:

```text
Docker
├── sin red
├── CPU limitada
├── RAM limitada
├── timeout
├── filesystem temporal
├── límite de procesos
├── límite de salida
└── sin acceso a credenciales
```

El código ejecutado no deberá tener acceso a:

* base de datos
* credenciales GitHub
* tests privados fuera del entorno estrictamente necesario
* secretos
* filesystem del servidor
* servicios internos

---

# 71. Aislamiento del runner

El runner deberá estar desacoplado de:

* API
* base de datos
* credenciales
* GitHub

La comunicación deberá realizarse mediante mensajes o una interfaz controlada.

Esto permitirá posteriormente:

```text
Runner 1
Runner 2
Runner 3
...
Runner N
```

sin modificar el resto de CodeLab.

---

# 72. Cola de evaluación

Las entregas no deberán ejecutarse necesariamente inmediatamente.

Se utilizará una cola:

```text
Submission
     ↓
   Queue
     ↓
 Runner disponible
```

Esto permitirá absorber picos de actividad.

---

# 73. Equidad de la cola

El sistema deberá evitar que un único alumno monopolice los runners.

Deberán contemplarse mecanismos como:

* límite de ejecuciones simultáneas por alumno
* planificación justa
* rate limiting
* límite de entregas por unidad de tiempo
* prioridad configurable

La cola deberá garantizar que un alumno que envíe muchas soluciones no bloquee al resto.

---

# 74. Cancelación

Una evaluación pendiente podrá ser cancelada cuando proceda.

También deberán poder cancelarse:

* actividades
* ejecuciones
* reevaluaciones

La cancelación no deberá modificar el historial.

---

# 75. Retención de datos

Deberá existir una política de retención configurable para:

* código
* logs
* resultados
* outputs
* evaluaciones
* auditoría

Las entregas oficiales deberán conservarse mientras sean necesarias para el historial académico.

Los logs técnicos podrán tener una política de retención diferente.

---

# 76. Privacidad

CodeLab deberá almacenar únicamente los datos necesarios.

El alumno solo podrá acceder a sus propios resultados.

El profesor podrá acceder a los resultados de los alumnos bajo su responsabilidad.

Los rankings y estadísticas públicas deberán respetar la configuración de privacidad.

---

# 77. Gamificación

CodeLab podrá incorporar un sistema de gamificación orientado a mejorar la motivación y la práctica.

Se podrán utilizar:

* insignias
* medallas
* logros
* hitos
* progreso
* niveles
* colecciones completadas
* mejoras de puntuación

Ejemplos:

```text
✓ Primer ejercicio
✓ 10 ejercicios resueltos
✓ Primera colección completada
✓ 5 ejercicios perfectos
✓ Mejorar una puntuación
```

---

# 78. Gamificación responsable

La gamificación deberá utilizar principalmente mecanismos de refuerzo positivo.

No deberán utilizarse mecanismos destinados a:

* humillar
* castigar públicamente
* generar ansiedad
* manipular mediante presión excesiva
* explotar datos personales innecesarios

Los rankings podrán ser opcionales y deberán estar configurados de forma que fomenten una competencia saludable.

Las notificaciones deberán ser configurables y no invasivas.

---

# 79. Analítica del aprendizaje

El sistema podrá recoger métricas útiles para el aprendizaje.

Ejemplos:

* ejercicios iniciados
* ejercicios intentados
* ejercicios aprobados
* ejercicios dominados
* número de intentos
* tiempo hasta el primer envío
* tiempo hasta resolver
* errores de compilación
* errores por test
* evolución de puntuación
* alumnos bloqueados

El tiempo empleado no deberá convertirse automáticamente en una calificación.

---

# 80. Hints y ayudas

El modelo podrá contemplar pistas.

Un ejercicio podrá tener:

```text
Hint 1
Hint 2
Hint 3
```

Las pistas podrán ser:

* gratuitas
* opcionales
* asociadas a una penalización

La penalización, si existe, deberá configurarse por actividad.

---

# 81. Estados de una actividad para un alumno

Cada alumno podrá tener un estado respecto a una actividad:

```text
NO_INICIADA
EN_PROGRESO
ENTREGADA
APROBADA
COMPLETADA
CERRADA
```

Esto será independiente del estado global del ejercicio.

---

# 82. Reglas temporales

Una entrega realizada antes del cierre pero evaluada posteriormente deberá conservar como referencia:

```text
fecha de envío
```

y no únicamente:

```text
fecha de evaluación
```

La validez de la entrega deberá determinarse respecto a las reglas vigentes en el momento de realizarla.

---

# 83. Ejercicios anulados

Un ejercicio o actividad podrá ser anulada.

Por ejemplo:

```text
Ejercicio con test incorrecto
```

Al anularlo:

* no se deberán borrar las entregas
* no se deberá destruir el historial
* podrá excluirse de determinadas calificaciones
* deberá quedar registrado el motivo

---

# 84. Recalculación de calificaciones

Las calificaciones podrán recalcularse cuando cambien las reglas de una actividad.

El sistema deberá mantener el historial de evaluaciones y evitar modificar retrospectivamente los datos originales.

---

# 85. API conceptual

La API no se considera todavía definitiva, pero conceptualmente podrá incluir:

```text
GET    /api/me
GET    /api/me/collections
GET    /api/me/activities

POST   /api/collections/access

GET    /api/collections/{id}
GET    /api/collections/{id}/exercises

GET    /api/exercises/{id}
GET    /api/exercises/{id}/public-tests

POST   /api/exercises/{id}/submissions

GET    /api/submissions/{id}
GET    /api/submissions/{id}/evaluations
```

Para profesores:

```text
GET    /api/teacher/courses
GET    /api/teacher/students
GET    /api/teacher/activities
GET    /api/teacher/submissions
GET    /api/teacher/statistics
```

No deberá existir para alumnos:

```text
GET /api/exercises
GET /api/collections/all
```

si dichas operaciones revelan contenido no autorizado.

---

# 86. Arquitectura lógica

La arquitectura deberá separar:

```text
                    CODELAB
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    CONTENT         LEARNING         EVALUATION
    ENGINE          ENGINE           ENGINE
       │               │                │
       │               │                ├── Queue
       │               │                └── Runner
       │               │
       │               ├── Courses
       │               ├── Groups
       │               ├── Activities
       │               ├── Progress
       │               └── Achievements
       │
       ├── Exercises
       ├── Collections
       ├── Versions
       └── Tests
```

Los mecanismos de entrega se conectarán al sistema de evaluación:

```text
                 ┌──────────────┐
                 │     WEB      │
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │      API     │
                 └──────┬───────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
      Web             GitHub          Futuras
   Submission        Submission       entradas
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                   Submission
                        │
                        ▼
                      Queue
                        │
                        ▼
                      Judge
                        │
                        ▼
                   Evaluation
```

---

# 87. Requisitos de capacidad

El sistema deberá soportar inicialmente:

* aproximadamente 50 alumnos
* 50 usuarios simultáneos
* aproximadamente 1 entrega cada 7 minutos por alumno
* aproximadamente 7 entregas/minuto como carga media máxima estimada
* picos superiores mediante cola

La arquitectura inicial no necesitará alta disponibilidad.

---

# 88. Infraestructura inicial

Un único VPS será suficiente para el MVP.

Conceptualmente:

```text
VPS
│
├── Reverse Proxy
├── CodeLab API
├── PostgreSQL
├── Queue
├── Runner
└── Frontend
```

Los runners deberán poder separarse posteriormente.

---

# 89. Coste objetivo

El objetivo inicial será mantener el coste aproximadamente en:

```text
0–5 €/mes
```

siempre que sea posible.

La arquitectura deberá evitar dependencias innecesarias de servicios externos de pago.

---

# 90. Escalabilidad

Aunque el MVP se ejecute en un único VPS, los componentes deberán diseñarse de manera que posteriormente pueda aumentarse la capacidad:

```text
                  Queue
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     Runner 1    Runner 2    Runner 3
```

La API no deberá asumir que existe un único runner.

---

# 91. Disponibilidad y errores

No se requiere alta disponibilidad en el MVP.

Sin embargo, los fallos deberán tratarse de forma explícita.

Por ejemplo:

```text
Runner caído
     ↓
Evaluation ERROR_SISTEMA
     ↓
NO consume intento
     ↓
Reintento automático/manual
```

---

# 92. Modelo de datos conceptual

Las principales entidades serán:

```text
User
Student
Teacher

Course
Group
CourseMembership

Collection
CollectionVersion
CollectionItem

Exercise
ExerciseVersion

Activity
ActivityExercise

AccessGrant

Submission
Evaluation
TestDefinition
TestResult

Runtime
GitHubConnection

Achievement
StudentProgress

AuditEvent
ContentSync
```

No necesariamente todas deberán ser tablas independientes en la primera implementación; el modelo físico se decidirá durante el diseño de PostgreSQL.

---

# 93. Relación fundamental de entidades

La relación conceptual principal será:

```text
Course
  │
  ├── Group
  │     └── Student
  │
  └── Activity
         │
         └── ActivityExercise
                │
                └── ExerciseVersion
                       │
                       └── Submission
                              │
                              └── Evaluation
                                     │
                                     └── TestResult
```

Las colecciones actuarán como mecanismo de organización y reutilización:

```text
Collection
    ↓
CollectionItem
    ↓
Exercise / Collection
```

---

# 94. Reutilización de ejercicios

Un ejercicio deberá poder utilizarse en múltiples actividades.

Ejemplo:

```text
Exercise: arrays-01

   ├── Curso 1 / Práctica
   ├── Curso 1 / Examen
   ├── Curso 2 / Recuperación
   └── Colección pública
```

Cada actividad podrá utilizar:

* una versión distinta
* diferentes fechas
* diferentes intentos
* diferente feedback
* diferente puntuación
* diferente disponibilidad
* diferente mecanismo de entrega

---

# 95. Reutilización de colecciones

Una colección podrá reutilizarse entre cursos:

```text
Java — Arrays
      │
      ├── 1DAM 2026/27
      ├── 2DAM 2026/27
      └── Curso público
```

El contenido no deberá duplicarse.

---

# 96. Resultados y privacidad

Por defecto:

```text
Alumno → sus resultados

Profesor → resultados de sus alumnos

Alumno ≠ resultados de otros alumnos
```

Los resultados agregados podrán mostrarse cuando no comprometan la privacidad.

---

# 97. Accesibilidad e internacionalización

Aunque no sean prioritarias para el MVP, la aplicación deberá evitar decisiones que dificulten:

* accesibilidad
* traducción
* diferentes idiomas
* diferentes formatos de fecha
* diferentes zonas horarias

Los textos de interfaz no deberán quedar necesariamente embebidos en la lógica de negocio.

---

# 98. Integraciones futuras

La arquitectura deberá permitir posteriormente:

* Moodle
* Microsoft
* Google
* sistemas de autenticación del centro
* LMS
* GitHub
* otros repositorios

Estas integraciones deberán actuar como adaptadores y no modificar el núcleo de evaluación.

---

# 99. MVP 1

El primer MVP deberá centrarse en el núcleo.

### Profesor

* repositorio GitHub privado
* ejercicios
* versiones
* colecciones
* tests públicos/privados
* publicación
* clave de acceso
* usuarios
* cursos básicos

### Alumno

* login
* ver colecciones disponibles
* acceder a ejercicios
* ejecutar tests públicos
* enviar Java
* recibir resultado
* consultar historial

### Sistema

* sincronización GitHub
* validación
* versionado
* cola
* Docker
* compilación Java
* tests privados
* comparadores
* puntuación
* historial
* aislamiento

---

# 100. MVP 2

Añadir:

* cursos completos
* grupos
* actividades
* asignaciones
* fechas
* número máximo de intentos
* modo examen
* práctica previa
* estadísticas del profesor
* exportación
* reevaluaciones
* auditoría
* feedback configurable
* GitHub como mecanismo de entrega

---

# 101. MVP 3

Añadir:

* varios lenguajes
* GitHub mediante push
* ejecución local de tests
* dashboard avanzado
* Apache ECharts
* analítica del aprendizaje
* gamificación
* logros
* hints
* integración con Moodle/centro
* autenticación externa

---

# 102. Principios arquitectónicos fundamentales

CodeLab deberá respetar las siguientes reglas:

### 1. El catálogo no es público

El alumno solo puede descubrir aquello a lo que tiene acceso.

### 2. GitHub no determina la visibilidad

Que un ejercicio exista en GitHub no significa que esté publicado.

### 3. Un ejercicio no es una actividad

El mismo ejercicio podrá utilizarse en diferentes contextos docentes.

### 4. Las entregas son inmutables

Nunca se deberá modificar retrospectivamente el código de una entrega.

### 5. Las evaluaciones son versionables

Una entrega podrá tener varias evaluaciones.

### 6. Una entrega se vincula a una versión exacta

Nunca se evaluará históricamente contra una versión posterior.

### 7. El canal de entrega es independiente del juez

Web y GitHub deben terminar en el mismo mecanismo de evaluación.

### 8. Los tests privados nunca salen del entorno seguro

No deberán estar disponibles para el alumno.

### 9. El código del alumno es potencialmente malicioso

Siempre deberá ejecutarse aislado.

### 10. Los errores de infraestructura no son errores del alumno

Un fallo del sistema no deberá consumir automáticamente un intento.

### 11. El contenido y la configuración docente están separados

GitHub contiene el contenido; CodeLab gestiona su utilización.

### 12. Las versiones publicadas deben ser reproducibles

Una evaluación histórica deberá poder reconstruirse.

---

# 103. Regla fundamental del sistema

Debe quedar explícitamente establecida la siguiente regla:

> **La existencia de un ejercicio en el repositorio de contenidos no implica que el ejercicio sea visible o accesible para ningún alumno.**

El ejercicio pertenece a una colección.

La colección puede formar parte de una actividad.

La actividad determina quién puede utilizarla, cuándo puede utilizarla y bajo qué condiciones.

Por tanto:

```text
GitHub
   │
   │ 500 ejercicios
   ▼
CodeLab
   │
   ├── Colección pública A → alumnos
   ├── Colección pública B → alumnos
   ├── Colección privada C → grupo
   ├── Colección privada D → examen
   ├── Colección privada E → recuperación
   │
   └── ejercicios no publicados
```

Un alumno podría tener acceso únicamente a:

```text
A
B
C
```

y no debería poder inferir la existencia de:

```text
D
E
```

ni de los demás ejercicios.

---

# 104. Regla fundamental sobre evaluación

Toda evaluación deberá poder responder inequívocamente a:

```text
¿Quién?
¿Qué ejercicio?
¿Qué versión?
¿Qué actividad?
¿Qué código?
¿Qué commit?
¿Qué tests?
¿Qué runtime?
¿Cuándo?
¿Qué resultado?
¿Qué puntuación?
```

Esto garantizará la reproducibilidad y trazabilidad del sistema.

---

# 105. Regla fundamental sobre seguridad

Nunca deberá existir un entorno de ejecución en el que el código del alumno pueda acceder simultáneamente a:

```text
Código del alumno
+
Tests privados
+
Credenciales
+
Base de datos
+
Secretos de CodeLab
```

El runner deberá recibir únicamente aquello que necesita para realizar una evaluación aislada.

---

# 106. Objetivo final de CodeLab

CodeLab no se limitará a ser un autograder.

La plataforma deberá evolucionar hacia:

```text
                    CODELAB
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    CONTENIDO       APRENDIZAJE      EVALUACIÓN
       │               │                │
       │               │                ├── Tests
       │               │                ├── Queue
       │               │                ├── Runner
       │               │                └── Scoring
       │               │
       │               ├── Cursos
       │               ├── Actividades
       │               ├── Progreso
       │               └── Gamificación
       │
       ├── Ejercicios
       ├── Colecciones
       ├── Versiones
       └── Material docente
```

El núcleo deberá permanecer sencillo y fiable, permitiendo añadir progresivamente funcionalidades educativas sin comprometer el motor de evaluación.

---

# 107. Decisiones explícitamente fuera del alcance inicial

No será necesario decidir todavía:

* proveedor definitivo de autenticación
* proveedor definitivo de VPS
* estructura exacta del repositorio GitHub
* framework frontend
* mecanismo definitivo de integración GitHub
* formato definitivo de todos los archivos de ejercicios
* soporte para lenguajes adicionales
* integración con Moodle
* sistema avanzado de gamificación
* sistema de hints
* sistema de evaluación manual avanzado

Estas decisiones deberán respetar el modelo conceptual definido en esta especificación.

---

# 108. Exclusión explícita

CodeLab **no incluirá inicialmente un sistema automático de detección de plagio o similitud entre soluciones**.

La arquitectura deberá, no obstante, mantener las entregas almacenadas de forma que pueda incorporarse cualquier mecanismo futuro de análisis de código si posteriormente se considera necesario.
