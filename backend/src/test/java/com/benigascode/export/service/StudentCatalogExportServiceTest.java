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
import com.benigascode.export.dto.StudentExportSummaryDTO;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentCatalogExportServiceTest {

    @Mock
    private ContentService contentService;
    @Mock
    private CollectionRepository collectionRepository;
    @Mock
    private CollectionVersionRepository collectionVersionRepository;
    @Mock
    private ExerciseRepository exerciseRepository;
    @Mock
    private ExerciseVersionRepository exerciseVersionRepository;
    @Mock
    private SubmissionRepository submissionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private StudentCatalogExportService service;
    private User student;

    @BeforeEach
    void setUp() {
        service = new StudentCatalogExportService(
                contentService,
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                submissionRepository,
                objectMapper
        );

        student = new User("alumno1", "hash", "Alumno Uno", Role.STUDENT);
        student.setId(UUID.randomUUID());
    }

    @Test
    void testCollectPreparedExercises_AndGenerateFiles() throws Exception {
        UUID colId = UUID.randomUUID();
        CollectionDTO colDto = new CollectionDTO(colId, "coleccion-1", "Colección 1", "Desc", "PUBLIC", 1);

        CollectionVersion cv = new CollectionVersion();
        cv.setItems("[{\"type\":\"EXERCISE\",\"id\":\"suma-dos-numeros\"},{\"type\":\"EXERCISE\",\"id\":\"hola-mundo\"}]");

        when(contentService.getMyCollections(student)).thenReturn(List.of(colDto));
        when(collectionVersionRepository.findLatestByCollectionId(colId)).thenReturn(Optional.of(cv));

        // El alumno ha hecho un envío para "suma-dos-numeros"
        Submission sub = new Submission();
        sub.setExerciseSlug("suma-dos-numeros");
        sub.setSourceCode("import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}\n");
        sub.setLanguage("java");

        when(submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())).thenReturn(List.of(sub));

        // Ejercicio 1: suma-dos-numeros
        Exercise ex1 = new Exercise("suma-dos-numeros");
        UUID ex1Id = UUID.randomUUID();
        ex1.setId(ex1Id);

        ExerciseVersion ev1 = new ExerciseVersion();
        ev1.setExercise(ex1);
        ev1.setTitle("Suma de dos números");
        ev1.setStatement("Lee dos números e imprime la suma.");
        ev1.setLanguage("java");
        ev1.setTestsConfig("{\"public\":[{\"id\":\"t1\",\"name\":\"Caso basico\",\"input\":\"3 5\\n\",\"expected\":\"8\\n\",\"explanation\":\"3+5=8\"}]}");

        when(exerciseRepository.findBySlug("suma-dos-numeros")).thenReturn(Optional.of(ex1));
        when(exerciseVersionRepository.findLatestByExerciseId(ex1Id)).thenReturn(Optional.of(ev1));
        when(submissionRepository.findByStudentAndExercise(student.getId(), ex1Id)).thenReturn(List.of(sub));

        // Ejercicio 2: hola-mundo (sin envío previo, usa plantilla)
        Exercise ex2 = new Exercise("hola-mundo");
        UUID ex2Id = UUID.randomUUID();
        ex2.setId(ex2Id);

        ExerciseVersion ev2 = new ExerciseVersion();
        ev2.setExercise(ex2);
        ev2.setTitle("Hola Mundo");
        ev2.setStatement("Imprime Hola Mundo.");
        ev2.setLanguage("java");
        ev2.setTemplatesConfig("{\"java\":\"public class Main { public static void main(String[] args) { System.out.println(\\\"Hola Mundo\\\"); } }\"}");
        ev2.setTestsConfig("{\"public\":[{\"id\":\"t1\",\"name\":\"Caso unico\",\"input\":\"\",\"expected\":\"Hola Mundo\\n\"}]}");

        when(exerciseRepository.findBySlug("hola-mundo")).thenReturn(Optional.of(ex2));
        when(exerciseVersionRepository.findLatestByExerciseId(ex2Id)).thenReturn(Optional.of(ev2));
        when(submissionRepository.findByStudentAndExercise(student.getId(), ex2Id)).thenReturn(Collections.emptyList());

        // 1. Verificar Summary
        StudentExportSummaryDTO summary = service.getExportSummary(student);
        assertEquals(1, summary.startedCollectionsCount());
        assertEquals(2, summary.exercisesCount());
        assertEquals("hola-mundo", summary.exercises().get(0).slug());
        assertEquals("suma-dos-numeros", summary.exercises().get(1).slug());
        assertTrue(summary.exercises().get(1).hasSubmission());
        assertFalse(summary.exercises().get(0).hasSubmission());

        // 2. Generar mapa de archivos
        Map<String, String> files = service.generateFiles(student);

        // Raíz
        assertTrue(files.containsKey("README.md"));
        assertTrue(files.containsKey("pom.xml"));
        assertTrue(files.containsKey("test.py"));
        assertTrue(files.containsKey(".github/workflows/tests.yml"));

        // Ejercicio suma-dos-numeros
        assertTrue(files.containsKey("suma-dos-numeros/README.md"));
        assertTrue(files.containsKey("suma-dos-numeros/src/Main.java"));
        assertTrue(files.containsKey("suma-dos-numeros/MainTest.java"));
        assertTrue(files.containsKey("suma-dos-numeros/tests/01.in"));
        assertTrue(files.containsKey("suma-dos-numeros/tests/01.out"));
        assertEquals("3 5\n", files.get("suma-dos-numeros/tests/01.in"));
        assertEquals("8\n", files.get("suma-dos-numeros/tests/01.out"));

        // Ejercicio hola-mundo
        assertTrue(files.containsKey("hola-mundo/README.md"));
        assertTrue(files.containsKey("hola-mundo/src/Main.java"));
        assertTrue(files.containsKey("hola-mundo/MainTest.java"));
        assertTrue(files.containsKey("hola-mundo/tests/01.in"));
        assertTrue(files.containsKey("hola-mundo/tests/01.out"));

        // 3. Generar y comprobar ZIP
        byte[] zipBytes = service.generateZip(student);
        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 0);

        Set<String> entriesInZip = new HashSet<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                entriesInZip.add(entry.getName());
                zis.closeEntry();
            }
        }

        assertTrue(entriesInZip.contains("README.md"));
        assertTrue(entriesInZip.contains("test.py"));
        assertTrue(entriesInZip.contains("suma-dos-numeros/src/Main.java"));
        assertTrue(entriesInZip.contains("suma-dos-numeros/tests/01.in"));
        assertTrue(entriesInZip.contains("hola-mundo/MainTest.java"));
    }
}
