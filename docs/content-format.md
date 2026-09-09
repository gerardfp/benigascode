# Formato de Contenidos — CodeLab Content Repository

El repositorio Git privado del profesor actúa como la **única fuente de verdad** del contenido docente de los ejercicios y colecciones.

---

## 1. Estructura del Repositorio

```text
codelab-content/
├── exercises/
│   └── calcular-media/
│       ├── exercise.yaml
│       ├── statement.md
│       ├── examples/
│       │   ├── example-01.in
│       │   └── example-01.out
│       ├── public-tests/
│       │   ├── test-01.in
│       │   ├── test-01.out
│       │   ├── test-02.in
│       │   └── test-02.out
│       └── private-tests/
│           ├── test-03.in
│           ├── test-03.out
│           ├── test-04.in
│           └── test-04.out
│
├── collections/
│   └── java-basics/
│       └── collection.yaml
│
└── runtimes/
    └── java-21/
        └── runtime.yaml
```

---

## 2. Definición de Ejercicio: `exercise.yaml`

```yaml
id: "calcular-media"
title: "Calcular la media de una serie de números"
slug: "calcular-media"
difficulty: "EASY"
tags: ["arrays", "bucles", "java"]
language: "java"
runtime: "java-21"

# Configuración de compilación
compile:
  command: "javac Main.java"
  timeout_seconds: 10

# Configuración de ejecución y límites del sandbox
execution:
  command: "java Main"
  timeout_seconds: 3
  memory_limit_mb: 256
  cpu_limit: 1.0
  pids_limit: 64
  max_output_bytes: 65536

# Configuración de puntuación y comparador por defecto
scoring:
  model: "PROPORTIONAL" # o "WEIGHTED"
  pass_threshold: 50.0

# Comparador por defecto para los tests
comparator:
  type: "TRIM" # EXACT, TRIM, WHITESPACE_INSENSITIVE, NUMERIC_TOLERANCE
  tolerance: 0.001

# Definición individual de tests y pesos
tests:
  public:
    - id: "pub-01"
      name: "Tres números enteros"
      weight: 15.0
      input: "public-tests/test-01.in"
      expected: "public-tests/test-01.out"
    - id: "pub-02"
      name: "Números con decimales"
      weight: 15.0
      input: "public-tests/test-02.in"
      expected: "public-tests/test-02.out"
  private:
    - id: "priv-01"
      name: "Valores negativos"
      weight: 35.0
      input: "private-tests/test-03.in"
      expected: "private-tests/test-03.out"
    - id: "priv-02"
      name: "Serie grande de datos"
      weight: 35.0
      input: "private-tests/test-04.in"
      expected: "private-tests/test-04.out"
```

---

## 3. Definición de Colección: `collection.yaml`

```yaml
id: "java-basics"
title: "Introducción a Java y Algoritmia"
slug: "java-basics"
description: "Ejercicios introductorios para dominar arrays y flujo de control."
language: "java"
visibility: "PRIVATE" # PUBLIC o PRIVATE

items:
  - type: "EXERCISE"
    id: "calcular-media"
    position: 1
    required: true
    weight: 100.0
```

Las colecciones pueden anidar otras colecciones en modalidad `LINKED` o `SNAPSHOT`:
```yaml
items:
  - type: "COLLECTION"
    id: "arrays-avanzados"
    mode: "LINKED"
    position: 2
```

---

## 4. Definición de Runtime: `runtime.yaml`

```yaml
id: "java-21"
name: "OpenJDK 21 LTS"
language: "java"
version: "21"
image: "eclipse-temurin:21-jdk-alpine"
image_digest: "sha256:7f4c5464197e416d8a4362b083aa25c6130ebbe89a7413b4d4b3164a6e9a30b2"
```

---

## 5. Pipeline de Validación e Importación Atómica

1. **Clonado/Descarga a Staging temporal**: Nunca se escribe directamente sobre las tablas vivas.
2. **Validación Sintáctica y Semántica**:
   - YAML conforme al esquema.
   - Presencia de archivos referenciados (`statement.md`, inputs, outputs).
   - Ausencia de ciclos en colecciones anidadas (grafo dirigido acíclico).
3. **Cálculo de Hash SHA-256**:
   Se calcula el hash del contenido para detectar cambios reales. Si el hash no cambia, no se crea una versión duplicada.
4. **Persistencia Atómica**:
   Se crean las entidades `ExerciseVersion` y `CollectionVersion` dentro de una transacción. Si cualquier validación falla, se realiza rollback completo y la versión publicada previa continúa activa sin perturbaciones.

