package com.benigascode.content.service;

import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseAsset;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.*;
import com.benigascode.submissions.service.SubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class CatalogFlatImportExportRoundTripTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testExportAllToDirectory_CreatesFlatExercisesAndAssetsFolder(@TempDir Path tempDir) throws Exception {
        ExerciseRepository exerciseRepository = mock(ExerciseRepository.class);
        ExerciseVersionRepository exerciseVersionRepository = mock(ExerciseVersionRepository.class);
        ExerciseAssetRepository exerciseAssetRepository = mock(ExerciseAssetRepository.class);
        CollectionRepository collectionRepository = mock(CollectionRepository.class);
        CollectionVersionRepository collectionVersionRepository = mock(CollectionVersionRepository.class);

        ContentExportService exportService = new ContentExportService(
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                objectMapper
        );

        // 1. Ejercicio 1 con 2 imágenes (1 referenciada, 1 huérfana)
        Exercise ex1 = new Exercise("suma-enteros");
        ex1.setId(UUID.randomUUID());
        ExerciseVersion ev1 = new ExerciseVersion();
        ev1.setExercise(ex1);
        ev1.setVersionNumber(1);
        ev1.setTitle("Suma de Enteros");
        ev1.setStatement("Calcula la suma. Ver diagrama:\n![Diagrama](diagrama.png)");

        ExerciseAsset assetRef = new ExerciseAsset(ex1, "diagrama.png", "image/png", new byte[]{10, 20, 30});
        assetRef.setId(UUID.randomUUID());
        ExerciseAsset assetOrphan = new ExerciseAsset(ex1, "antigua.jpg", "image/jpeg", new byte[]{40, 50});
        assetOrphan.setId(UUID.randomUUID());

        // 2. Ejercicio 2 sin imágenes
        Exercise ex2 = new Exercise("hola-mundo");
        ex2.setId(UUID.randomUUID());
        ExerciseVersion ev2 = new ExerciseVersion();
        ev2.setExercise(ex2);
        ev2.setVersionNumber(1);
        ev2.setTitle("Hola Mundo");
        ev2.setStatement("Imprime hola mundo.");

        when(exerciseRepository.findAll()).thenReturn(List.of(ex1, ex2));
        when(exerciseVersionRepository.findLatestByExerciseId(ex1.getId())).thenReturn(Optional.of(ev1));
        when(exerciseVersionRepository.findLatestByExerciseId(ex2.getId())).thenReturn(Optional.of(ev2));

        when(exerciseAssetRepository.findByExerciseId(ex1.getId())).thenReturn(List.of(assetRef, assetOrphan));
        when(exerciseAssetRepository.findByExerciseId(ex2.getId())).thenReturn(List.of());

        when(collectionRepository.findAll()).thenReturn(List.of());

        File baseDir = tempDir.toFile();
        exportService.exportAllToDirectory(baseDir);

        File exercisesDir = new File(baseDir, "exercises");
        assertTrue(exercisesDir.exists() && exercisesDir.isDirectory());

        // 3. Verificar que los ficheros .md están directamente en exercises/
        File ex1Md = new File(exercisesDir, "suma-enteros.md");
        File ex2Md = new File(exercisesDir, "hola-mundo.md");
        assertTrue(ex1Md.exists(), "Debe existir exercises/suma-enteros.md");
        assertTrue(ex2Md.exists(), "Debe existir exercises/hola-mundo.md");

        // 4. No deben existir carpetas por cada ejercicio
        assertFalse(new File(exercisesDir, "suma-enteros").exists(), "NO debe existir la subcarpeta exercises/suma-enteros/");
        assertFalse(new File(exercisesDir, "hola-mundo").exists(), "NO debe existir la subcarpeta exercises/hola-mundo/");

        // 5. Verificar carpeta exercises/assets/
        File assetsDir = new File(exercisesDir, "assets");
        assertTrue(assetsDir.exists() && assetsDir.isDirectory());

        File expectedImg = new File(assetsDir, "suma-enteros-img0.png");
        assertTrue(expectedImg.exists(), "Debe existir exercises/assets/suma-enteros-img0.png");
        assertArrayEquals(new byte[]{10, 20, 30}, Files.readAllBytes(expectedImg.toPath()));

        // El asset huérfano NO debe existir en exercises/assets/
        File orphanImg = new File(assetsDir, "suma-enteros-img1.jpg");
        assertFalse(orphanImg.exists(), "El asset huérfano NO debe exportarse");

        // 6. Verificar que el asset huérfano fue purgado de la base de datos
        verify(exerciseAssetRepository).deleteAll(List.of(assetOrphan));

        // 7. Verificar que el markdown de suma-enteros.md contiene la ruta a assets/
        String ex1MdContent = Files.readString(ex1Md.toPath());
        assertTrue(ex1MdContent.contains("![Diagrama](assets/suma-enteros-img0.png)"));
    }

    @Test
    void testImportFlatCatalog_DiscoversAndFiltersUnreferencedAssets(@TempDir Path tempDir) throws Exception {
        ExerciseRepository exerciseRepository = mock(ExerciseRepository.class);
        ExerciseVersionRepository exerciseVersionRepository = mock(ExerciseVersionRepository.class);
        ExerciseAssetRepository exerciseAssetRepository = mock(ExerciseAssetRepository.class);
        CollectionRepository collectionRepository = mock(CollectionRepository.class);
        CollectionVersionRepository collectionVersionRepository = mock(CollectionVersionRepository.class);
        ContentSyncRepository contentSyncRepository = mock(ContentSyncRepository.class);
        GitOperationsService gitOperationsService = mock(GitOperationsService.class);

        SubmissionService submissionService = mock(SubmissionService.class);

        ContentSyncService syncService = new ContentSyncService(
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                submissionService,
                objectMapper
        );

        ContentExportService exportService = new ContentExportService(
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                objectMapper
        );

        CatalogImportExportService catalogService = new CatalogImportExportService(
                exerciseRepository,
                exerciseVersionRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                syncService,
                exportService,
                gitOperationsService,
                submissionService
        );

        // Crear estructura en disco:
        // exercises/
        //   assets/
        //     suma-dos-img0.png
        //     suma-dos-img1.png (huérfana, no referenciada)
        //   suma-dos.md
        File catalogDir = tempDir.toFile();
        File exercisesDir = new File(catalogDir, "exercises");
        File assetsDir = new File(exercisesDir, "assets");
        exercisesDir.mkdirs();
        assetsDir.mkdirs();

        File img0 = new File(assetsDir, "suma-dos-img0.png");
        Files.write(img0.toPath(), new byte[]{1, 2, 3});

        File img1 = new File(assetsDir, "suma-dos-img1.png");
        Files.write(img1.toPath(), new byte[]{9, 9, 9});

        String markdown = """
                ---
                slug: suma-dos
                tags: [basico]
                ---
                # Suma Dos
                Mira la imagen:
                ![Diagrama](assets/suma-dos-img0.png)
                """;
        File mdFile = new File(exercisesDir, "suma-dos.md");
        Files.writeString(mdFile.toPath(), markdown);

        List<CatalogImportExportService.ExerciseSource> sources = catalogService.findExerciseSources(catalogDir);
        assertEquals(1, sources.size());

        CatalogImportExportService.ExerciseSource src = sources.get(0);
        assertEquals("suma-dos", src.defaultSlug());
        assertEquals(mdFile.getAbsolutePath(), src.markdownFile().getAbsolutePath());

        // Debe incluir solo img0 porque está referenciada; img1 huérfana debe ser ignorada
        assertEquals(1, src.assetFiles().size());
        assertEquals("suma-dos-img0.png", src.assetFiles().get(0).getName());
    }

    @Test
    void testImportLegacyCatalog_SubdirectoriesAreIgnored(@TempDir Path tempDir) throws Exception {
        ExerciseRepository exerciseRepository = mock(ExerciseRepository.class);
        ExerciseVersionRepository exerciseVersionRepository = mock(ExerciseVersionRepository.class);
        ExerciseAssetRepository exerciseAssetRepository = mock(ExerciseAssetRepository.class);
        CollectionRepository collectionRepository = mock(CollectionRepository.class);
        CollectionVersionRepository collectionVersionRepository = mock(CollectionVersionRepository.class);
        ContentSyncRepository contentSyncRepository = mock(ContentSyncRepository.class);
        GitOperationsService gitOperationsService = mock(GitOperationsService.class);

        SubmissionService submissionService = mock(SubmissionService.class);

        ContentSyncService syncService = new ContentSyncService(
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                submissionService,
                objectMapper
        );

        ContentExportService exportService = new ContentExportService(
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                objectMapper
        );

        CatalogImportExportService catalogService = new CatalogImportExportService(
                exerciseRepository,
                exerciseVersionRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                syncService,
                exportService,
                gitOperationsService,
                submissionService
        );

        // Estructura heredada de subcarpetas (no debe ser importada):
        // exercises/
        //   legacy-ex/
        //     exercise.md
        //     diagram.png
        File catalogDir = tempDir.toFile();
        File exercisesDir = new File(catalogDir, "exercises");
        File legacyDir = new File(exercisesDir, "legacy-ex");
        legacyDir.mkdirs();

        File img = new File(legacyDir, "diagram.png");
        Files.write(img.toPath(), new byte[]{5, 5});

        String markdown = """
                # Ejercicio Legacy
                ![Diagrama](diagram.png)
                """;
        File mdFile = new File(legacyDir, "exercise.md");
        Files.writeString(mdFile.toPath(), markdown);

        List<CatalogImportExportService.ExerciseSource> sources = catalogService.findExerciseSources(catalogDir);
        assertTrue(sources.isEmpty(), "Las subcarpetas con exercise.md deben ser ignoradas: solo formato plano exercises/*.md");
    }

    @Test
    void testExportAllToDirectory_RenamingAvoidsDuplicateKeyWhenTargetFilenameMatchesOrphan(@TempDir Path tempDir) throws Exception {
        ExerciseRepository exerciseRepository = mock(ExerciseRepository.class);
        ExerciseVersionRepository exerciseVersionRepository = mock(ExerciseVersionRepository.class);
        ExerciseAssetRepository exerciseAssetRepository = mock(ExerciseAssetRepository.class);
        CollectionRepository collectionRepository = mock(CollectionRepository.class);
        CollectionVersionRepository collectionVersionRepository = mock(CollectionVersionRepository.class);

        ContentExportService exportService = new ContentExportService(
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                objectMapper
        );

        // Ejercicio donde el huérfano tiene acronimo-img0.png y el referenciado es acronimo-img1.png
        Exercise ex = new Exercise("acronimo");
        ex.setId(UUID.randomUUID());
        ExerciseVersion ev = new ExerciseVersion();
        ev.setExercise(ex);
        ev.setVersionNumber(1);
        ev.setTitle("Acrónimo");
        ev.setStatement("Enunciado:\n![img](acronimo-img1.png)");

        ExerciseAsset orphan = new ExerciseAsset(ex, "acronimo-img0.png", "image/png", new byte[]{1});
        orphan.setId(UUID.randomUUID());
        ExerciseAsset referenced = new ExerciseAsset(ex, "acronimo-img1.png", "image/png", new byte[]{2});
        referenced.setId(UUID.randomUUID());

        when(exerciseRepository.findAll()).thenReturn(List.of(ex));
        when(exerciseVersionRepository.findLatestByExerciseId(ex.getId())).thenReturn(Optional.of(ev));
        when(exerciseAssetRepository.findByExerciseId(ex.getId())).thenReturn(List.of(orphan, referenced));
        when(collectionRepository.findAll()).thenReturn(List.of());

        File baseDir = tempDir.toFile();
        exportService.exportAllToDirectory(baseDir);

        // Verificar que deleteAll con orphan se ejecutó y que se hizo flush()
        verify(exerciseAssetRepository).deleteAll(List.of(orphan));
        verify(exerciseAssetRepository, atLeastOnce()).flush();
        assertEquals("acronimo-img0.png", referenced.getFilename());
    }

    @Test
    void testExportAndImport_WithExplanationImages(@TempDir Path tempDir) throws Exception {
        ExerciseRepository exerciseRepository = mock(ExerciseRepository.class);
        ExerciseVersionRepository exerciseVersionRepository = mock(ExerciseVersionRepository.class);
        ExerciseAssetRepository exerciseAssetRepository = mock(ExerciseAssetRepository.class);
        CollectionRepository collectionRepository = mock(CollectionRepository.class);
        CollectionVersionRepository collectionVersionRepository = mock(CollectionVersionRepository.class);
        ContentSyncRepository contentSyncRepository = mock(ContentSyncRepository.class);
        GitOperationsService gitOperationsService = mock(GitOperationsService.class);

        ContentExportService exportService = new ContentExportService(
                collectionRepository,
                collectionVersionRepository,
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                objectMapper
        );

        SubmissionService submissionService = mock(SubmissionService.class);

        ContentSyncService syncService = new ContentSyncService(
                exerciseRepository,
                exerciseVersionRepository,
                exerciseAssetRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                submissionService,
                objectMapper
        );

        CatalogImportExportService catalogService = new CatalogImportExportService(
                exerciseRepository,
                exerciseVersionRepository,
                collectionRepository,
                collectionVersionRepository,
                contentSyncRepository,
                syncService,
                exportService,
                gitOperationsService,
                submissionService
        );

        Exercise ex = new Exercise("xocolata-if");
        ex.setId(UUID.randomUUID());

        String initialStatement = "El enunciado tiene una imagen: ![Logo](logo.png)";
        String initialTestsConfig = """
                {
                  "public": [
                    {
                      "id": "pub-1",
                      "name": "Test 1",
                      "input": "5\\n",
                      "expected": "10\\n",
                      "weight": 1.0,
                      "explanation": "Observa el diagrama del test: ![Diagrama](test-diagram.png)"
                    }
                  ]
                }
                """;

        ExerciseVersion ev = new ExerciseVersion();
        ev.setExercise(ex);
        ev.setVersionNumber(1);
        ev.setTitle("Xocolata IF");
        ev.setStatement(initialStatement);
        ev.setTestsConfig(initialTestsConfig);
        ev.setSolutionsConfig("{\"java\":\"public class Main {}\\n\",\"python\":\"print(10)\\n\"}");

        ExerciseAsset asset1 = new ExerciseAsset(ex, "logo.png", "image/png", new byte[]{1, 1, 1});
        asset1.setId(UUID.randomUUID());
        ExerciseAsset asset2 = new ExerciseAsset(ex, "test-diagram.png", "image/png", new byte[]{2, 2, 2});
        asset2.setId(UUID.randomUUID());

        when(exerciseRepository.findAll()).thenReturn(List.of(ex));
        when(exerciseVersionRepository.findLatestByExerciseId(ex.getId())).thenReturn(Optional.of(ev));
        when(exerciseAssetRepository.findByExerciseId(ex.getId())).thenReturn(List.of(asset1, asset2));
        when(collectionRepository.findAll()).thenReturn(List.of());

        File baseDir = tempDir.toFile();
        exportService.exportAllToDirectory(baseDir);

        // 1. Verificar que ninguno de los dos assets fue eliminado
        verify(exerciseAssetRepository, never()).deleteAll(any());

        // 2. Verificar que ambos assets se exportaron a exercises/assets/
        File assetsDir = new File(baseDir, "exercises/assets");
        File img0 = new File(assetsDir, "xocolata-if-img0.png");
        File img1 = new File(assetsDir, "xocolata-if-img1.png");
        assertTrue(img0.exists(), "Debe existir xocolata-if-img0.png");
        assertTrue(img1.exists(), "Debe existir xocolata-if-img1.png");

        // 3. Verificar que el markdown exportado tiene las rutas reescritas tanto en enunciado como en explanation, y también ## Solutions
        File mdFile = new File(baseDir, "exercises/xocolata-if.md");
        assertTrue(mdFile.exists());
        String mdContent = Files.readString(mdFile.toPath());
        assertTrue(mdContent.contains("![Logo](assets/xocolata-if-img0.png)"));
        assertTrue(mdContent.contains("#### Explanation"));
        assertTrue(mdContent.contains("![Diagrama](assets/xocolata-if-img1.png)"));
        assertFalse(mdContent.contains("test-diagram.png"));
        assertTrue(mdContent.contains("## Solutions"), "El markdown exportado debe incluir el apartado ## Solutions");
        assertTrue(mdContent.contains("```java\npublic class Main {}\n```"));
        assertTrue(mdContent.contains("```python\nprint(10)\n```"));

        // 4. Verificar que al importar el catálogo, detecta ambos assets para el ejercicio
        List<CatalogImportExportService.ExerciseSource> sources = catalogService.findExerciseSources(baseDir);
        assertEquals(1, sources.size());
        CatalogImportExportService.ExerciseSource src = sources.get(0);
        assertEquals(2, src.assetFiles().size(), "Debe detectar los 2 assets referenciados (enunciado y explanation)");
    }
}
