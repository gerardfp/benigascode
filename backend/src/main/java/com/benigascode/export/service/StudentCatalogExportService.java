package com.benigascode.export.service;

import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.content.service.ContentService;
import com.benigascode.export.dto.ExportExerciseItemDTO;
import com.benigascode.export.dto.StudentExportSummaryDTO;
import com.benigascode.identity.domain.User;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class StudentCatalogExportService {

    private static final Logger log = LoggerFactory.getLogger(StudentCatalogExportService.class);

    private final ContentService contentService;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public StudentCatalogExportService(ContentService contentService,
                                       CollectionRepository collectionRepository,
                                       CollectionVersionRepository collectionVersionRepository,
                                       ExerciseRepository exerciseRepository,
                                       ExerciseVersionRepository exerciseVersionRepository,
                                       SubmissionRepository submissionRepository,
                                       ObjectMapper objectMapper) {
        this.contentService = contentService;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.submissionRepository = submissionRepository;
        this.objectMapper = objectMapper;
    }

    public record PublicTestCase(String id, String name, String input, String expected, String explanation) {}

    public record PreparedExercise(
            String slug,
            String title,
            String statement,
            String language,
            String sourceCode,
            String className,
            List<PublicTestCase> publicTests
    ) {}

    /**
     * Devuelve el resumen de colecciones y ejercicios que se exportarán para el alumno.
     */
    @Transactional(readOnly = true)
    public StudentExportSummaryDTO getExportSummary(User student) {
        List<PreparedExercise> preparedList = collectPreparedExercises(student);
        Set<UUID> startedCollectionIds = findStartedCollectionIds(student);

        List<ExportExerciseItemDTO> items = preparedList.stream()
                .map(p -> {
                    boolean hasSub = submissionRepository.findByStudentAndExercise(
                            student.getId(),
                            exerciseRepository.findBySlug(p.slug()).map(Exercise::getId).orElse(null)
                    ).size() > 0;
                    return new ExportExerciseItemDTO(
                            p.slug(),
                            p.title(),
                            hasSub,
                            p.language(),
                            p.publicTests().size()
                    );
                })
                .toList();

        return new StudentExportSummaryDTO(
                startedCollectionIds.size(),
                preparedList.size(),
                items
        );
    }

    /**
     * Genera en memoria el mapa de rutas relativas -> contenido de archivos a exportar.
     */
    @Transactional(readOnly = true)
    public Map<String, String> generateFiles(User student) {
        List<PreparedExercise> exercises = collectPreparedExercises(student);
        Map<String, String> files = new LinkedHashMap<>();

        // Archivos raíz
        files.put("README.md", buildRootReadme(student, exercises));
        files.put("pom.xml", buildPomXml());
        files.put("test.py", buildTestRunnerScript());
        files.put(".github/workflows/tests.yml", buildGitHubActionsWorkflow());

        // Archivos de cada ejercicio (estructura plana por slug)
        for (PreparedExercise ex : exercises) {
            String dir = ex.slug();

            // 1. Enunciado
            files.put(dir + "/README.md", buildExerciseReadme(ex));

            // 2. Casos de prueba en texto plano (.in / .out)
            for (int i = 0; i < ex.publicTests().size(); i++) {
                PublicTestCase tc = ex.publicTests().get(i);
                String idxStr = String.format("%02d", i + 1);
                files.put(dir + "/tests/" + idxStr + ".in", tc.input() != null ? tc.input() : "");
                files.put(dir + "/tests/" + idxStr + ".out", tc.expected() != null ? tc.expected() : "");
            }

            // 3. Código fuente y tests nativos según lenguaje
            boolean isPython = ex.language() != null && ex.language().toLowerCase().contains("python");
            if (isPython) {
                files.put(dir + "/src/solution.py", ex.sourceCode());
                files.put(dir + "/test_solution.py", buildPythonTestClass(ex));
            } else {
                String clsName = (ex.className() != null && !ex.className().isBlank()) ? ex.className() : "Main";
                files.put(dir + "/src/" + clsName + ".java", ex.sourceCode());
                files.put(dir + "/" + clsName + "Test.java", buildJavaTestClass(ex, clsName));
            }
        }

        return files;
    }

    /**
     * Genera un archivo ZIP con el catálogo completo de ejercicios.
     */
    @Transactional(readOnly = true)
    public byte[] generateZip(User student) throws IOException {
        Map<String, String> files = generateFiles(student);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
            for (Map.Entry<String, String> entry : files.entrySet()) {
                ZipEntry ze = new ZipEntry(entry.getKey());
                zos.putNextEntry(ze);
                zos.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    /**
     * Recopila todos los ejercicios pertenecientes a las colecciones que el alumno ha empezado.
     */
    public List<PreparedExercise> collectPreparedExercises(User student) {
        List<Submission> allSubs = submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        Set<String> attemptedSlugs = allSubs.stream()
                .map(Submission::getExerciseSlug)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<CollectionDTO> myCollections = contentService.getMyCollections(student);
        Set<String> targetSlugs = new LinkedHashSet<>();

        for (CollectionDTO col : myCollections) {
            Optional<CollectionVersion> cvOpt = collectionVersionRepository.findLatestByCollectionId(col.id());
            if (cvOpt.isEmpty()) continue;
            CollectionVersion cv = cvOpt.get();

            List<String> colSlugs = extractSlugsFromCollectionVersion(cv);
            boolean hasAttempt = colSlugs.stream().anyMatch(attemptedSlugs::contains);

            if (hasAttempt) {
                targetSlugs.addAll(colSlugs);
            }
        }

        // Añadir también cualquier ejercicio suelto donde el alumno haya hecho envíos
        targetSlugs.addAll(attemptedSlugs);

        List<PreparedExercise> result = new ArrayList<>();
        for (String slug : targetSlugs) {
            Optional<Exercise> exOpt = exerciseRepository.findBySlug(slug);
            if (exOpt.isEmpty()) continue;
            Exercise ex = exOpt.get();

            Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
            if (evOpt.isEmpty()) continue;
            ExerciseVersion ev = evOpt.get();

            // Buscar la última entrega del alumno para este ejercicio
            List<Submission> exSubs = submissionRepository.findByStudentAndExercise(student.getId(), ex.getId());
            String sourceCode;
            String language;

            if (!exSubs.isEmpty()) {
                Submission latest = exSubs.get(0);
                sourceCode = latest.getSourceCode();
                language = (latest.getLanguage() != null && !latest.getLanguage().isBlank())
                        ? latest.getLanguage().toLowerCase() : "java";
            } else {
                // Si aún no ha entregado, extraer plantilla
                language = (ev.getLanguage() != null && !ev.getLanguage().isBlank())
                        ? ev.getLanguage().toLowerCase() : "java";
                sourceCode = extractStarterTemplate(ev, language);
            }

            String className = detectJavaClassName(sourceCode);
            List<PublicTestCase> publicTests = extractPublicTests(ev);

            result.add(new PreparedExercise(
                    ex.getSlug(),
                    ev.getTitle() != null ? ev.getTitle() : ex.getSlug(),
                    ev.getStatement() != null ? ev.getStatement() : "",
                    language,
                    sourceCode,
                    className,
                    publicTests
            ));
        }

        result.sort(Comparator.comparing(PreparedExercise::slug));
        return result;
    }

    private Set<UUID> findStartedCollectionIds(User student) {
        List<Submission> allSubs = submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        Set<String> attemptedSlugs = allSubs.stream()
                .map(Submission::getExerciseSlug)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<CollectionDTO> myCollections = contentService.getMyCollections(student);
        Set<UUID> started = new LinkedHashSet<>();

        for (CollectionDTO col : myCollections) {
            Optional<CollectionVersion> cvOpt = collectionVersionRepository.findLatestByCollectionId(col.id());
            if (cvOpt.isEmpty()) continue;
            List<String> colSlugs = extractSlugsFromCollectionVersion(cvOpt.get());
            if (colSlugs.stream().anyMatch(attemptedSlugs::contains)) {
                started.add(col.id());
            }
        }
        return started;
    }

    private List<String> extractSlugsFromCollectionVersion(CollectionVersion cv) {
        List<String> slugs = new ArrayList<>();
        if (cv.getItems() == null || cv.getItems().isBlank()) return slugs;
        try {
            JsonNode items = objectMapper.readTree(cv.getItems());
            if (items.isArray()) {
                for (JsonNode it : items) {
                    if ("EXERCISE".equalsIgnoreCase(it.path("type").asText())) {
                        String id = it.path("id").asText();
                        if (id != null && !id.isBlank()) {
                            slugs.add(id);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return slugs;
    }

    private String extractStarterTemplate(ExerciseVersion ev, String language) {
        if (ev.getTemplatesConfig() != null && !ev.getTemplatesConfig().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ev.getTemplatesConfig());
                if (root.hasNonNull(language)) {
                    return root.get(language).asText();
                }
                if (language.equals("java") && root.hasNonNull("java26")) {
                    return root.get("java26").asText();
                }
                if (language.equals("python") && root.hasNonNull("python3")) {
                    return root.get("python3").asText();
                }
                Iterator<String> fieldNames = root.fieldNames();
                if (fieldNames.hasNext()) {
                    return root.get(fieldNames.next()).asText();
                }
            } catch (Exception ignored) {}
        }

        if ("python".equalsIgnoreCase(language)) {
            return "import sys\n\ndef main():\n    # Escribe aquí tu solución\n    pass\n\nif __name__ == '__main__':\n    main()\n";
        }
        return "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Escribe aquí tu solución\n    }\n}\n";
    }

    private String detectJavaClassName(String sourceCode) {
        if (sourceCode == null) return "Main";
        Matcher m = Pattern.compile("\\bpublic\\s+(?:final\\s+|abstract\\s+)?class\\s+(\\w+)").matcher(sourceCode);
        if (m.find()) {
            return m.group(1);
        }
        Matcher m2 = Pattern.compile("\\bclass\\s+(\\w+)").matcher(sourceCode);
        if (m2.find()) {
            return m2.group(1);
        }
        return "Main";
    }

    private List<PublicTestCase> extractPublicTests(ExerciseVersion ev) {
        List<PublicTestCase> tests = new ArrayList<>();
        if (ev.getTestsConfig() == null || ev.getTestsConfig().isBlank()) return tests;

        try {
            JsonNode root = objectMapper.readTree(ev.getTestsConfig());
            JsonNode pubArray = root.path("public");
            if (pubArray.isArray()) {
                for (JsonNode t : pubArray) {
                    tests.add(new PublicTestCase(
                            t.path("id").asText("test"),
                            t.path("name").asText("Caso de prueba"),
                            t.path("input").asText(""),
                            t.path("expected").asText(""),
                            t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Error al extraer tests públicos para ejercicio {}: {}", ev.getExercise().getSlug(), e.getMessage());
        }
        return tests;
    }

    private String buildExerciseReadme(PreparedExercise ex) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(ex.title()).append("\n\n");
        if (ex.statement() != null && !ex.statement().isBlank()) {
            sb.append(ex.statement()).append("\n\n");
        }
        sb.append("## Casos de prueba públicos\n\n");
        if (ex.publicTests().isEmpty()) {
            sb.append("*Este ejercicio no tiene casos de prueba públicos configurados.*\n");
        } else {
            for (int i = 0; i < ex.publicTests().size(); i++) {
                PublicTestCase tc = ex.publicTests().get(i);
                sb.append("### Caso ").append(i + 1).append(": ").append(tc.name()).append("\n\n");
                sb.append("**Entrada:**\n```text\n").append(tc.input()).append("\n```\n\n");
                sb.append("**Salida esperada:**\n```text\n").append(tc.expected()).append("\n```\n\n");
                if (tc.explanation() != null && !tc.explanation().isBlank()) {
                    sb.append("**Explicación:**\n").append(tc.explanation()).append("\n\n");
                }
            }
        }
        return sb.toString();
    }

    private String buildJavaTestClass(PreparedExercise ex, String className) {
        StringBuilder sb = new StringBuilder();
        sb.append("import org.junit.jupiter.api.Test;\n");
        sb.append("import org.junit.jupiter.api.DisplayName;\n");
        sb.append("import static org.junit.jupiter.api.Assertions.assertEquals;\n");
        sb.append("import java.io.ByteArrayInputStream;\n");
        sb.append("import java.io.ByteArrayOutputStream;\n");
        sb.append("import java.io.InputStream;\n");
        sb.append("import java.io.PrintStream;\n");
        sb.append("import java.nio.charset.StandardCharsets;\n\n");
        sb.append("public class ").append(className).append("Test {\n\n");
        sb.append("    private String runProgram(String input) throws Exception {\n");
        sb.append("        InputStream originalIn = System.in;\n");
        sb.append("        PrintStream originalOut = System.out;\n");
        sb.append("        try {\n");
        sb.append("            System.setIn(new ByteArrayInputStream(input.getBytes(StandardCharsets.UTF_8)));\n");
        sb.append("            ByteArrayOutputStream out = new ByteArrayOutputStream();\n");
        sb.append("            System.setOut(new PrintStream(out, true, StandardCharsets.UTF_8));\n");
        sb.append("            ").append(className).append(".main(new String[0]);\n");
        sb.append("            return out.toString(StandardCharsets.UTF_8);\n");
        sb.append("        } finally {\n");
        sb.append("            System.setIn(originalIn);\n");
        sb.append("            System.setOut(originalOut);\n");
        sb.append("        }\n");
        sb.append("    }\n\n");
        sb.append("    private void assertOutputsEqual(String expected, String actual) {\n");
        sb.append("        String cleanExpected = expected.trim().replace(\"\\r\\n\", \"\\n\");\n");
        sb.append("        String cleanActual = actual.trim().replace(\"\\r\\n\", \"\\n\");\n");
        sb.append("        assertEquals(cleanExpected, cleanActual);\n");
        sb.append("    }\n\n");

        if (ex.publicTests().isEmpty()) {
            sb.append("    @Test\n");
            sb.append("    @DisplayName(\"Sin casos de prueba públicos\")\n");
            sb.append("    public void testPlaceholder() {\n");
            sb.append("        // Este ejercicio no contiene casos de prueba públicos.\n");
            sb.append("    }\n");
        } else {
            for (int i = 0; i < ex.publicTests().size(); i++) {
                PublicTestCase tc = ex.publicTests().get(i);
                String idxStr = String.format("%02d", i + 1);
                String safeName = escapeJavaString(tc.name());

                sb.append("    @Test\n");
                sb.append("    @DisplayName(\"Caso ").append(i + 1).append(": ").append(safeName).append("\")\n");
                sb.append("    public void test").append(idxStr).append("() throws Exception {\n");
                sb.append("        String input = \"\"\"\n");
                sb.append(escapeJavaTextBlock(tc.input())).append("\"\"\";\n");
                sb.append("        String expected = \"\"\"\n");
                sb.append(escapeJavaTextBlock(tc.expected())).append("\"\"\";\n");
                sb.append("        String actual = runProgram(input);\n");
                sb.append("        assertOutputsEqual(expected, actual);\n");
                sb.append("    }\n\n");
            }
        }

        sb.append("}\n");
        return sb.toString();
    }

    private String buildPythonTestClass(PreparedExercise ex) {
        StringBuilder sb = new StringBuilder();
        sb.append("import unittest\n");
        sb.append("import sys\n");
        sb.append("import os\n");
        sb.append("import io\n\n");
        sb.append("# Añadir directorio src al path para importar la solución\n");
        sb.append("sys.path.insert(0, os.path.join(os.path.dirname(__file__), \"src\"))\n");
        sb.append("import solution\n\n");
        sb.append("class TestSolution(unittest.TestCase):\n\n");
        sb.append("    def run_program(self, input_data: str) -> str:\n");
        sb.append("        old_stdin = sys.stdin\n");
        sb.append("        old_stdout = sys.stdout\n");
        sb.append("        try:\n");
        sb.append("            sys.stdin = io.StringIO(input_data)\n");
        sb.append("            captured = io.StringIO()\n");
        sb.append("            sys.stdout = captured\n");
        sb.append("            if hasattr(solution, 'main'):\n");
        sb.append("                solution.main()\n");
        sb.append("            return captured.getvalue()\n");
        sb.append("        finally:\n");
        sb.append("            sys.stdin = old_stdin\n");
        sb.append("            sys.stdout = old_stdout\n\n");
        sb.append("    def assert_outputs_equal(self, expected: str, actual: str):\n");
        sb.append("        clean_expected = expected.strip().replace('\\r\\n', '\\n')\n");
        sb.append("        clean_actual = actual.strip().replace('\\r\\n', '\\n')\n");
        sb.append("        self.assertEqual(clean_expected, clean_actual)\n\n");

        if (ex.publicTests().isEmpty()) {
            sb.append("    def test_placeholder(self):\n");
            sb.append("        pass\n");
        } else {
            for (int i = 0; i < ex.publicTests().size(); i++) {
                PublicTestCase tc = ex.publicTests().get(i);
                String idxStr = String.format("%02d", i + 1);
                sb.append("    def test_").append(idxStr).append("(self):\n");
                sb.append("        \"\"\"Caso ").append(i + 1).append(": ").append(escapePythonString(tc.name())).append("\"\"\"\n");
                sb.append("        input_data = \"\"\"\n").append(escapePythonTextBlock(tc.input())).append("\"\"\"\n");
                sb.append("        expected = \"\"\"\n").append(escapePythonTextBlock(tc.expected())).append("\"\"\"\n");
                sb.append("        actual = self.run_program(input_data)\n");
                sb.append("        self.assert_outputs_equal(expected, actual)\n\n");
            }
        }

        sb.append("if __name__ == '__main__':\n");
        sb.append("    unittest.main()\n");
        return sb.toString();
    }

    private String escapeJavaString(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String escapeJavaTextBlock(String s) {
        if (s == null) return "";
        String res = s.replace("\"\"\"", "\\\"\\\"\\\"");
        if (!res.endsWith("\n")) {
            res = res + "\n";
        }
        return res;
    }

    private String escapePythonString(String s) {
        if (s == null) return "";
        return s.replace("\"", "'");
    }

    private String escapePythonTextBlock(String s) {
        if (s == null) return "";
        String res = s.replace("\"\"\"", "\\\"\\\"\\\"");
        if (!res.endsWith("\n")) {
            res = res + "\n";
        }
        return res;
    }

    private String buildPomXml() {
        return """
        <project xmlns="http://maven.apache.org/POM/4.0.0"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
            <modelVersion>4.0.0</modelVersion>
            <groupId>com.benigascode.student</groupId>
            <artifactId>catalogo-ejercicios</artifactId>
            <version>1.0.0</version>
            <name>Catálogo de Ejercicios Benigascode</name>

            <properties>
                <maven.compiler.source>21</maven.compiler.source>
                <maven.compiler.target>21</maven.compiler.target>
                <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
            </properties>

            <dependencies>
                <dependency>
                    <groupId>org.junit.jupiter</groupId>
                    <artifactId>junit-jupiter</artifactId>
                    <version>5.10.2</version>
                    <scope>test</scope>
                </dependency>
            </dependencies>
        </project>
        """;
    }

    private String buildRootReadme(User student, List<PreparedExercise> exercises) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Catálogo de Ejercicios - Benigascode\n\n");
        sb.append("Repositorio exportado por **").append(student.getFullName() != null ? student.getFullName() : student.getUsername()).append("**.\n");
        sb.append("Contiene ").append(exercises.size()).append(" ejercicios con sus soluciones y casos de prueba públicos.\n\n");
        sb.append("## Cómo ejecutar los tests en local\n\n");
        sb.append("### 1. Desde la terminal (rápido y global)\n\n");
        sb.append("El script `test.py` ejecuta automáticamente los casos de prueba públicos de tus ejercicios.\n\n");
        sb.append("```bash\n");
        sb.append("# Probar todos los ejercicios del repositorio\n");
        sb.append("python test.py\n\n");
        sb.append("# Probar solo un ejercicio concreto por su slug\n");
        sb.append("python test.py <slug-del-ejercicio>\n");
        sb.append("```\n\n");
        sb.append("### 2. Desde tu IDE (IntelliJ IDEA, VS Code, Eclipse, PyCharm)\n\n");
        sb.append("- **Java**: Cada ejercicio incluye una clase `*Test.java` (JUnit 5). Ábrela en tu IDE y haz clic en el botón verde ▶️ para ejecutar o depurar.\n");
        sb.append("- **Python**: Cada ejercicio incluye un `test_solution.py` ejecutable directamente con el runner de `unittest`.\n\n");
        sb.append("## Ejercicios incluidos\n\n");
        for (PreparedExercise ex : exercises) {
            sb.append("- [`").append(ex.slug()).append("`](./").append(ex.slug()).append("/README.md): **").append(ex.title()).append("** (").append(ex.language()).append(")\n");
        }
        return sb.toString();
    }

    private String buildTestRunnerScript() {
        return """
        #!/usr/bin/env python3
        \"\"\"
        Benigascode Local Test Runner
        Permite compilar y ejecutar en local los casos de prueba públicos de los ejercicios.

        Uso:
            python test.py                 # Ejecuta todos los ejercicios
            python test.py suma-dos-numeros # Ejecuta un ejercicio concreto
        \"\"\"
        import os
        import sys
        import subprocess
        import re
        from pathlib import Path

        def compare_output(actual: str, expected: str) -> bool:
            return actual.strip().replace('\\r\\n', '\\n') == expected.strip().replace('\\r\\n', '\\n')

        def run_exercise(exercise_dir: Path) -> tuple[int, int]:
            slug = exercise_dir.name
            tests_dir = exercise_dir / "tests"
            src_dir = exercise_dir / "src"

            if not tests_dir.exists() or not src_dir.exists():
                return (0, 0)

            in_files = sorted(tests_dir.glob("*.in"))
            if not in_files:
                return (0, 0)

            print(f"\\n{'='*60}\\n Ejercicio: {slug}\\n{'='*60}")

            java_files = list(src_dir.glob("*.java"))
            py_files = list(src_dir.glob("*.py"))

            if java_files:
                main_java = java_files[0]
                class_name = main_java.stem
                try:
                    content = main_java.read_text(encoding="utf-8")
                    m = re.search(r'\\bpublic\\s+class\\s+(\\w+)', content)
                    if m:
                        class_name = m.group(1)
                except Exception:
                    pass

                print(f" [Compilando Java: {main_java.name}...]")
                compile_proc = subprocess.run(
                    ["javac", str(main_java)],
                    capture_output=True,
                    text=True
                )
                if compile_proc.returncode != 0:
                    print(f"  [ERROR DE COMPILACIÓN]\\n{compile_proc.stderr}")
                    return (0, len(in_files))

                run_cmd = ["java", "-cp", str(src_dir), class_name]

            elif py_files:
                main_py = py_files[0]
                run_cmd = [sys.executable, str(main_py)]
            else:
                print(f"  [SKIP] No se encontró código fuente en {src_dir}")
                return (0, len(in_files))

            passed = 0
            for in_file in in_files:
                test_name = in_file.stem
                out_file = tests_dir / f"{test_name}.out"
                expected_output = out_file.read_text(encoding="utf-8") if out_file.exists() else ""
                test_input = in_file.read_text(encoding="utf-8")

                try:
                    proc = subprocess.run(
                        run_cmd,
                        input=test_input,
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    actual_output = proc.stdout
                    if proc.returncode != 0:
                        print(f"  [FAIL] Test {test_name}: Error en tiempo de ejecución (código {proc.returncode})")
                        if proc.stderr:
                            print(f"         {proc.stderr.strip()[:200]}")
                    elif compare_output(actual_output, expected_output):
                        print(f"  [PASS] Test {test_name}")
                        passed += 1
                    else:
                        print(f"  [FAIL] Test {test_name}: Salida incorrecta")
                        print(f"         Esperada: {expected_output.strip()[:80]!r}")
                        print(f"         Obtenida: {actual_output.strip()[:80]!r}")
                except subprocess.TimeoutExpired:
                    print(f"  [FAIL] Test {test_name}: Tiempo límite excedido (5s)")
                except Exception as ex:
                    print(f"  [FAIL] Test {test_name}: {ex}")

            print(f" -> Resultado: {passed}/{len(in_files)} tests superados")
            return (passed, len(in_files))

        def main():
            root = Path(__file__).parent.resolve()
            target_slug = sys.argv[1] if len(sys.argv) > 1 else None

            if target_slug:
                ex_dir = root / target_slug
                if not ex_dir.is_dir():
                    print(f"Error: No existe la carpeta del ejercicio '{target_slug}'")
                    sys.exit(1)
                passed, total = run_exercise(ex_dir)
                sys.exit(0 if passed == total else 1)

            exercise_dirs = sorted([d for d in root.iterdir() if d.is_dir() and (d / "tests").exists()])
            if not exercise_dirs:
                print("No se encontraron ejercicios con carpeta 'tests' en este directorio.")
                sys.exit(0)

            total_passed = 0
            total_tests = 0
            for ex_dir in exercise_dirs:
                p, t = run_exercise(ex_dir)
                total_passed += p
                total_tests += t

            print(f"\\n{'='*60}\\n RESUMEN GLOBAL: {total_passed}/{total_tests} tests superados\\n{'='*60}")
            sys.exit(0 if total_passed == total_tests else 1)

        if __name__ == '__main__':
            main()
        """;
    }

    private String buildGitHubActionsWorkflow() {
        return """
        name: Pruebas de ejercicios Benigascode

        on:
          push:
            branches: [ main, master ]
          pull_request:
            branches: [ main, master ]

        jobs:
          test:
            runs-on: ubuntu-latest
            steps:
              - name: Descargar repositorio
                uses: actions/checkout@v4

              - name: Configurar Java 21
                uses: actions/setup-java@v4
                with:
                  distribution: 'temurin'
                  java-version: '21'

              - name: Configurar Python 3.11
                uses: actions/setup-python@v5
                with:
                  python-version: '3.11'

              - name: Ejecutar casos de prueba públicos
                run: python test.py
        """;
    }
}
