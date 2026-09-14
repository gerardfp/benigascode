package com.benigascode.content.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.dto.*;
import com.benigascode.content.repository.*;
import com.benigascode.identity.domain.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class CatalogImportExportService {

    private static final Logger log = LoggerFactory.getLogger(CatalogImportExportService.class);

    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ContentSyncRepository contentSyncRepository;
    private final ContentSyncService contentSyncService;
    private final ContentExportService contentExportService;
    private final GitOperationsService gitOperationsService;
    private final ObjectMapper jsonMapper;
    private final ObjectMapper yamlMapper;

    public CatalogImportExportService(ExerciseRepository exerciseRepository,
                                      ExerciseVersionRepository exerciseVersionRepository,
                                      CollectionRepository collectionRepository,
                                      CollectionVersionRepository collectionVersionRepository,
                                      ContentSyncRepository contentSyncRepository,
                                      ContentSyncService contentSyncService,
                                      ContentExportService contentExportService,
                                      GitOperationsService gitOperationsService) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.contentSyncRepository = contentSyncRepository;
        this.contentSyncService = contentSyncService;
        this.contentExportService = contentExportService;
        this.gitOperationsService = gitOperationsService;
        this.jsonMapper = contentSyncService.getJsonMapper();
        this.yamlMapper = contentSyncService.getYamlMapper();
    }

    /**
     * Simula y comprueba la importación del catálogo sin realizar cambios en la base de datos.
     */
    /**
     * Simula y comprueba la importación del catálogo desde un repositorio Git sin realizar cambios en la base de datos.
     */
    @Transactional(readOnly = true)
    public CatalogImportPreviewDTO previewImport(CatalogImportRequest request) {
        File repoDir = null;
        try {
            repoDir = gitOperationsService.cloneToTemp(
                request.repositoryUrl(),
                request.branch(),
                request.authType(),
                request.authToken(),
                null
            );

            String commitSha = gitOperationsService.runProcess(List.of("git", "rev-parse", "HEAD"), repoDir, Map.of()).trim();
            File catalogDir = resolveTargetDirectory(repoDir, request.rootPath());

            return previewCatalogFromDirectory(catalogDir, request.conflictStrategy(), request.repositoryUrl(), request.branch(), commitSha);

        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Error al previsualizar importación del catálogo", e);
            throw new ValidationException("Error al comprobar el repositorio: " + e.getMessage());
        } finally {
            if (repoDir != null) {
                gitOperationsService.deleteRecursively(repoDir);
            }
        }
    }

    /**
     * Simula y comprueba la importación del catálogo desde un archivo ZIP sin realizar cambios en la base de datos.
     */
    @Transactional(readOnly = true)
    public CatalogImportPreviewDTO previewZipImport(MultipartFile file, CatalogConflictStrategy conflictStrategy) {
        validateZipFile(file);
        File tempDir = null;
        try {
            tempDir = Files.createTempDirectory("benigascode-zip-import-").toFile();
            extractZip(file.getInputStream(), tempDir);
            File catalogDir = findCatalogBaseDir(tempDir);

            List<File> exerciseDirs = findExerciseDirectories(catalogDir);
            List<File> collectionDirs = findCollectionDirectories(catalogDir);
            if (exerciseDirs.isEmpty() && collectionDirs.isEmpty()) {
                throw new ValidationException("El archivo ZIP no contiene ninguna carpeta 'exercises' ni 'collections' válida.");
            }

            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "catalogo.zip";
            return previewCatalogFromDirectory(catalogDir, conflictStrategy, filename, "zip", "zip-" + Instant.now().getEpochSecond());

        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Error al previsualizar importación ZIP", e);
            throw new ValidationException("Error al procesar el archivo ZIP: " + e.getMessage());
        } finally {
            if (tempDir != null) {
                gitOperationsService.deleteRecursively(tempDir);
            }
        }
    }

    /**
     * Comprueba y calcula las acciones de importación sobre un directorio de catálogo.
     */
    public CatalogImportPreviewDTO previewCatalogFromDirectory(
            File catalogDir,
            CatalogConflictStrategy conflictStrategy,
            String sourceName,
            String branch,
            String commitSha) {

        CatalogConflictStrategy strategy = conflictStrategy != null ? conflictStrategy : CatalogConflictStrategy.OVERWRITE;
        List<CatalogImportItemDTO> items = new ArrayList<>();
        Set<String> plannedExerciseSlugs = new HashSet<>();
        Set<String> plannedCollectionSlugs = new HashSet<>();

        int existingExercisesCount = 0;
        int newExercisesCount = 0;
        int existingCollectionsCount = 0;
        int newCollectionsCount = 0;

        // 1. Escanear Ejercicios
        List<File> exerciseDirs = findExerciseDirectories(catalogDir);
        for (File exDir : exerciseDirs) {
            String origSlug = resolveExerciseSlug(exDir);
            String title = resolveExerciseTitle(exDir, origSlug);
            boolean exists = exerciseRepository.findBySlug(origSlug).isPresent();

            String action;
            String targetSlug;

            if (!exists) {
                newExercisesCount++;
                action = "CREATE";
                targetSlug = origSlug;
            } else {
                existingExercisesCount++;
                switch (strategy) {
                    case OVERWRITE -> {
                        action = "OVERWRITE";
                        targetSlug = origSlug;
                    }
                    case SKIP -> {
                        action = "SKIP";
                        targetSlug = origSlug;
                    }
                    case NEW_SLUG -> {
                        action = "CREATE_NEW_SLUG";
                        targetSlug = generateNextExerciseSlug(origSlug, plannedExerciseSlugs);
                        plannedExerciseSlugs.add(targetSlug);
                    }
                    default -> throw new IllegalArgumentException("Estrategia no válida: " + strategy);
                }
            }

            items.add(new CatalogImportItemDTO(origSlug, title, "EXERCISE", exists, action, targetSlug));
        }

        // 2. Escanear Colecciones
        List<File> collectionDirs = findCollectionDirectories(catalogDir);
        for (File colDir : collectionDirs) {
            String origSlug = resolveCollectionSlug(colDir);
            String title = resolveCollectionTitle(colDir, origSlug);
            boolean exists = collectionRepository.findBySlug(origSlug).isPresent();

            String action;
            String targetSlug;

            if (!exists) {
                newCollectionsCount++;
                action = "CREATE";
                targetSlug = origSlug;
            } else {
                existingCollectionsCount++;
                switch (strategy) {
                    case OVERWRITE -> {
                        action = "OVERWRITE";
                        targetSlug = origSlug;
                    }
                    case SKIP -> {
                        action = "SKIP";
                        targetSlug = origSlug;
                    }
                    case NEW_SLUG -> {
                        action = "CREATE_NEW_SLUG";
                        targetSlug = generateNextCollectionSlug(origSlug, plannedCollectionSlugs);
                        plannedCollectionSlugs.add(targetSlug);
                    }
                    default -> throw new IllegalArgumentException("Estrategia no válida: " + strategy);
                }
            }

            items.add(new CatalogImportItemDTO(origSlug, title, "COLLECTION", exists, action, targetSlug));
        }

        return new CatalogImportPreviewDTO(
            sourceName,
            branch,
            commitSha,
            exerciseDirs.size(),
            collectionDirs.size(),
            existingExercisesCount,
            newExercisesCount,
            existingCollectionsCount,
            newCollectionsCount,
            strategy,
            items
        );
    }

    /**
     * Ejecuta la importación del catálogo desde Git aplicando la estrategia seleccionada.
     */
    @Transactional
    public CatalogImportResultDTO executeImport(CatalogImportRequest request) {
        File repoDir = null;
        try {
            repoDir = gitOperationsService.cloneToTemp(
                request.repositoryUrl(),
                request.branch(),
                request.authType(),
                request.authToken(),
                null
            );

            String commitSha = gitOperationsService.runProcess(List.of("git", "rev-parse", "HEAD"), repoDir, Map.of()).trim();
            File catalogDir = resolveTargetDirectory(repoDir, request.rootPath());
            String syncPrefix = "catalog_import_" + commitSha.substring(0, Math.min(commitSha.length(), 7));

            return executeCatalogFromDirectory(catalogDir, request.conflictStrategy(), commitSha, syncPrefix);

        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Error crítico durante la ejecución de importación", e);
            throw new ValidationException("Error al importar el catálogo: " + e.getMessage());
        } finally {
            if (repoDir != null) {
                gitOperationsService.deleteRecursively(repoDir);
            }
        }
    }

    /**
     * Ejecuta la importación del catálogo desde un archivo ZIP aplicando la estrategia seleccionada.
     */
    @Transactional
    public CatalogImportResultDTO executeZipImport(MultipartFile file, CatalogConflictStrategy conflictStrategy) {
        validateZipFile(file);
        File tempDir = null;
        try {
            tempDir = Files.createTempDirectory("benigascode-zip-import-").toFile();
            extractZip(file.getInputStream(), tempDir);
            File catalogDir = findCatalogBaseDir(tempDir);

            List<File> exerciseDirs = findExerciseDirectories(catalogDir);
            List<File> collectionDirs = findCollectionDirectories(catalogDir);
            if (exerciseDirs.isEmpty() && collectionDirs.isEmpty()) {
                throw new ValidationException("El archivo ZIP no contiene ninguna carpeta 'exercises' ni 'collections' válida.");
            }

            String syncPrefix = "zip_import_" + Instant.now().getEpochSecond();
            return executeCatalogFromDirectory(catalogDir, conflictStrategy, "zip-import", syncPrefix);

        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Error al ejecutar importación ZIP", e);
            throw new ValidationException("Error al importar el archivo ZIP: " + e.getMessage());
        } finally {
            if (tempDir != null) {
                gitOperationsService.deleteRecursively(tempDir);
            }
        }
    }

    /**
     * Ejecuta la importación del catálogo sobre un directorio dado con resolución de conflictos.
     */
    public CatalogImportResultDTO executeCatalogFromDirectory(
            File catalogDir,
            CatalogConflictStrategy conflictStrategy,
            String commitSha,
            String syncPrefix) {

        CatalogConflictStrategy strategy = conflictStrategy != null ? conflictStrategy : CatalogConflictStrategy.OVERWRITE;
        ContentSync sync = new ContentSync(syncPrefix);
        sync = contentSyncRepository.save(sync);

        int importedNew = 0;
        int overwritten = 0;
        int skipped = 0;
        int renamed = 0;
        int collectionsProcessed = 0;

        List<String> errors = new ArrayList<>();
        List<String> createdLog = new ArrayList<>();
        Map<String, String> slugRemapping = new HashMap<>();
        Set<String> usedExerciseSlugs = new HashSet<>();
        Set<String> usedCollectionSlugs = new HashSet<>();

        // Precargar defaults de colecciones para herencia de ejecución/compilación
        Map<String, ContentSyncService.CollectionDefaults> exerciseSlugToDefaults = new HashMap<>();
        ContentSyncService.CollectionDefaults defaultCollectionDefaults = new ContentSyncService.CollectionDefaults();

        List<File> collectionDirs = findCollectionDirectories(catalogDir);
        for (File colDir : collectionDirs) {
            File colYaml = new File(colDir, "collection.yaml");
            if (colYaml.exists()) {
                try {
                    JsonNode colNode = yamlMapper.readTree(colYaml);
                    ContentSyncService.CollectionDefaults cd = new ContentSyncService.CollectionDefaults();
                    if (colNode.has("language")) cd.language = colNode.get("language").asText("java");
                    if (colNode.has("runtime")) cd.runtimeId = colNode.get("runtime").asText("java-21");
                    if (colNode.has("compile")) cd.compileJson = jsonMapper.writeValueAsString(colNode.get("compile"));
                    if (colNode.has("execution")) cd.runJson = jsonMapper.writeValueAsString(colNode.get("execution"));
                    if (colNode.has("scoring")) cd.scoringJson = jsonMapper.writeValueAsString(colNode.get("scoring"));
                    if (colNode.has("comparator")) cd.comparatorJson = jsonMapper.writeValueAsString(colNode.get("comparator"));

                    defaultCollectionDefaults = cd;

                    JsonNode itemsNode = colNode.path("items");
                    if (itemsNode.isArray()) {
                        for (JsonNode item : itemsNode) {
                            String exId = item.path("id").asText();
                            if (!exId.isBlank()) {
                                exerciseSlugToDefaults.put(exId, cd);
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Error leyendo defaults de colección: " + colDir.getName(), ex);
                }
            }
        }

        // 1. Procesar Ejercicios
        List<File> exerciseDirs = findExerciseDirectories(catalogDir);
        for (File exDir : exerciseDirs) {
            try {
                String origSlug = resolveExerciseSlug(exDir);
                boolean exists = exerciseRepository.findBySlug(origSlug).isPresent();

                String targetSlug = origSlug;
                boolean isNew = false;
                boolean isOverwritten = false;
                boolean isRenamed = false;

                if (!exists) {
                    isNew = true;
                } else {
                    switch (strategy) {
                        case SKIP -> {
                            skipped++;
                            continue;
                        }
                        case OVERWRITE -> {
                            isOverwritten = true;
                        }
                        case NEW_SLUG -> {
                            isRenamed = true;
                            targetSlug = generateNextExerciseSlug(origSlug, usedExerciseSlugs);
                            usedExerciseSlugs.add(targetSlug);
                            slugRemapping.put(origSlug, targetSlug);
                        }
                    }
                }

                ContentSyncService.CollectionDefaults colDefaults = exerciseSlugToDefaults.getOrDefault(origSlug, defaultCollectionDefaults);
                importSingleExercise(exDir, targetSlug, commitSha, colDefaults);

                if (isNew) importedNew++;
                else if (isOverwritten) overwritten++;
                else if (isRenamed) renamed++;

                createdLog.add("Exercise: " + targetSlug + (isRenamed ? " (renombrado desde " + origSlug + ")" : ""));

            } catch (Exception ex) {
                log.error("Error al importar ejercicio desde " + exDir.getName(), ex);
                errors.add("Ejercicio " + exDir.getName() + ": " + ex.getMessage());
            }
        }

        // 2. Procesar Colecciones
        for (File colDir : collectionDirs) {
            try {
                String origSlug = resolveCollectionSlug(colDir);
                boolean exists = collectionRepository.findBySlug(origSlug).isPresent();

                String targetSlug = origSlug;
                if (exists) {
                    if (strategy == CatalogConflictStrategy.SKIP) {
                        continue;
                    } else if (strategy == CatalogConflictStrategy.NEW_SLUG) {
                        targetSlug = generateNextCollectionSlug(origSlug, usedCollectionSlugs);
                        usedCollectionSlugs.add(targetSlug);
                    }
                }

                importSingleCollection(colDir, targetSlug, slugRemapping);
                collectionsProcessed++;
                createdLog.add("Collection: " + targetSlug);

            } catch (Exception ex) {
                log.error("Error al importar colección desde " + colDir.getName(), ex);
                errors.add("Colección " + colDir.getName() + ": " + ex.getMessage());
            }
        }

        int totalProcessed = importedNew + overwritten + skipped + renamed;
        String status = errors.isEmpty() ? "SUCCESS" : (totalProcessed == 0 && collectionsProcessed == 0 ? "FAILED" : "WARNING");
        try {
            sync.finish(status, jsonMapper.writeValueAsString(errors), jsonMapper.writeValueAsString(createdLog));
            contentSyncRepository.save(sync);
        } catch (Exception ex) {
            log.error("Error al guardar estado final de sincronización", ex);
        }

        return new CatalogImportResultDTO(
            status,
            totalProcessed,
            importedNew,
            overwritten,
            skipped,
            renamed,
            collectionsProcessed,
            commitSha,
            errors
        );
    }

    /**
     * Exporta todo el catálogo activo a un repositorio Git haciendo commit y push.
     */
    @Transactional(readOnly = true)
    public CatalogExportPushResultDTO exportCatalogToGit(CatalogExportPushRequest request, User teacher) {
        File repoDir = null;
        try {
            repoDir = gitOperationsService.cloneToTemp(
                request.repositoryUrl(),
                request.branch(),
                "OAUTH_TOKEN",
                request.authToken(),
                null
            );

            File catalogDir = resolveTargetDirectory(repoDir, request.rootPath());

            // Vaciar carpetas exercises y collections en el repo clonado para reflejar estado actual de BD
            File exercisesFolder = new File(catalogDir, "exercises");
            File collectionsFolder = new File(catalogDir, "collections");

            if (exercisesFolder.exists()) {
                gitOperationsService.deleteRecursively(exercisesFolder);
            }
            if (collectionsFolder.exists()) {
                gitOperationsService.deleteRecursively(collectionsFolder);
            }

            exercisesFolder.mkdirs();
            collectionsFolder.mkdirs();

            // Exportar catálogo completo desde BD
            contentExportService.exportAllToDirectory(catalogDir);

            int exercisesCount = exerciseRepository.findAll().size();
            int collectionsCount = collectionRepository.findAll().size();

            // Ejecutar commit y push
            String authorName = (teacher != null && teacher.getFullName() != null && !teacher.getFullName().isBlank())
                    ? teacher.getFullName()
                    : "Benigascode";
            String authorEmail = (teacher != null && teacher.getUsername() != null && !teacher.getUsername().isBlank())
                    ? teacher.getUsername() + "@benigascode.local"
                    : "catalog@benigascode.local";

            String commitMessage = (request.commitMessage() != null && !request.commitMessage().isBlank())
                    ? request.commitMessage()
                    : "Export catalog from Benigascode - " + Instant.now();

            String commitSha = gitOperationsService.pushToRemote(
                repoDir,
                request.repositoryUrl(),
                request.branch(),
                request.authToken(),
                commitMessage,
                authorName,
                authorEmail
            );

            String successMsg = String.format("Catálogo exportado exitosamente con %d ejercicios y %d colecciones.", exercisesCount, collectionsCount);

            return new CatalogExportPushResultDTO(
                true,
                commitSha,
                exercisesCount,
                collectionsCount,
                successMsg,
                request.repositoryUrl()
            );

        } catch (Exception e) {
            log.error("Error al exportar catálogo y hacer push a Git", e);
            String rawMsg = e.getMessage() != null ? e.getMessage() : "";
            if (rawMsg.contains("Permission to") || rawMsg.contains("403") || rawMsg.contains("denied")) {
                throw new ValidationException("Permiso denegado por GitHub (403): La aplicación conectada no tiene permisos de escritura ('Contents: Read and write') en este repositorio o la GitHub App no está instalada en tu cuenta de GitHub. Asegúrate de configurar 'Contents: Read and write' en tu GitHub App e instalarla, o bien exporta seleccionando 'Otro repositorio' con un Personal Access Token (PAT) con permisos de repositorio.");
            }
            throw new ValidationException("Error en exportación Git: " + rawMsg);
        } finally {
            if (repoDir != null) {
                gitOperationsService.deleteRecursively(repoDir);
            }
        }
    }

    // ==================== MÉTODOS AUXILIARES DE IMPORTACIÓN ====================

    private void importSingleExercise(File exerciseDir, String targetSlug, String gitCommit, ContentSyncService.CollectionDefaults colDefaults) throws Exception {
        File yamlFile = new File(exerciseDir, "exercise.yaml");
        JsonNode yamlNode = yamlFile.exists() ? yamlMapper.readTree(yamlFile) : null;

        File statementFile = new File(exerciseDir, "statement.md");
        String statement = statementFile.exists() ? Files.readString(statementFile.toPath()) : "Sin enunciado";

        String title = contentSyncService.extractTitle(statementFile, targetSlug);
        if (yamlNode != null && yamlNode.has("title") && !yamlNode.path("title").asText().isBlank()) {
            title = yamlNode.path("title").asText();
        }

        String language = (yamlNode != null && yamlNode.has("language"))
                ? yamlNode.path("language").asText(colDefaults.language)
                : colDefaults.language;

        String runtimeId = (yamlNode != null && yamlNode.has("runtime"))
                ? yamlNode.path("runtime").asText(colDefaults.runtimeId)
                : colDefaults.runtimeId;

        Map<String, Object> testSuite = contentSyncService.loadTestSuite(exerciseDir, yamlNode);
        String testsJson = jsonMapper.writeValueAsString(testSuite);

        String compileJson = (yamlNode != null && yamlNode.has("compile"))
                ? jsonMapper.writeValueAsString(yamlNode.path("compile"))
                : colDefaults.compileJson;

        String runJson = (yamlNode != null && yamlNode.has("execution"))
                ? jsonMapper.writeValueAsString(yamlNode.path("execution"))
                : colDefaults.runJson;

        String scoringJson = (yamlNode != null && yamlNode.has("scoring"))
                ? jsonMapper.writeValueAsString(yamlNode.path("scoring"))
                : colDefaults.scoringJson;

        String comparatorJson = (yamlNode != null && yamlNode.has("comparator"))
                ? jsonMapper.writeValueAsString(yamlNode.path("comparator"))
                : colDefaults.comparatorJson;

        String templatesJson = jsonMapper.writeValueAsString(contentSyncService.loadTemplates(exerciseDir, yamlNode));
        String contentHash = contentSyncService.computeHash(statement + testsJson + compileJson + runJson + templatesJson);

        Exercise exercise = exerciseRepository.findBySlug(targetSlug)
                .orElseGet(() -> exerciseRepository.save(new Exercise(targetSlug)));

        contentSyncService.syncAssets(exercise, exerciseDir);

        Optional<ExerciseVersion> latest = exerciseVersionRepository.findLatestByExerciseId(exercise.getId());
        int nextVersion = latest.map(v -> v.getVersionNumber() + 1).orElse(1);

        ExerciseVersion version = new ExerciseVersion();
        version.setExercise(exercise);
        version.setVersionNumber(nextVersion);
        version.setTitle(title);
        version.setStatement(statement);
        version.setLanguage(language);
        version.setRuntimeId(runtimeId);
        version.setCompileConfig(compileJson);
        version.setRunConfig(runJson);
        version.setScoringConfig(scoringJson);
        version.setComparatorConfig(comparatorJson);
        version.setTestsConfig(testsJson);
        version.setTemplatesConfig(templatesJson);
        version.setContentHash(contentHash);
        version.setGitCommit(gitCommit);
        version.setStatus("PUBLISHED");

        exerciseVersionRepository.save(version);
    }

    private void importSingleCollection(File colDir, String targetSlug, Map<String, String> slugRemapping) throws Exception {
        File yamlFile = new File(colDir, "collection.yaml");
        if (!yamlFile.exists()) return;

        JsonNode yamlNode = yamlMapper.readTree(yamlFile);
        String title = yamlNode.path("title").asText(targetSlug);
        String description = yamlNode.path("description").asText("");
        String visibility = yamlNode.path("visibility").asText("PRIVATE").toUpperCase();

        // Remapear slugs de ejercicios en items si fueron renombrados
        JsonNode itemsNode = yamlNode.path("items");
        if (itemsNode.isArray() && !slugRemapping.isEmpty()) {
            ArrayNode remappedArray = jsonMapper.createArrayNode();
            for (JsonNode item : itemsNode) {
                if (item.isObject()) {
                    ObjectNode obj = (ObjectNode) item.deepCopy();
                    String exId = obj.path("id").asText();
                    if (slugRemapping.containsKey(exId)) {
                        obj.put("id", slugRemapping.get(exId));
                    }
                    remappedArray.add(obj);
                } else {
                    remappedArray.add(item);
                }
            }
            itemsNode = remappedArray;
        }

        String itemsJson = jsonMapper.writeValueAsString(itemsNode);
        String templatesJson = jsonMapper.writeValueAsString(contentSyncService.loadTemplates(colDir, yamlNode));

        Collection collection = collectionRepository.findBySlug(targetSlug)
                .orElseGet(() -> collectionRepository.save(new Collection(targetSlug, visibility)));

        Optional<CollectionVersion> latest = collectionVersionRepository.findLatestByCollectionId(collection.getId());
        int nextVersion = latest.map(v -> v.getVersionNumber() + 1).orElse(1);

        CollectionVersion version = new CollectionVersion();
        version.setCollection(collection);
        version.setVersionNumber(nextVersion);
        version.setTitle(title);
        version.setDescription(description);
        version.setItems(itemsJson);
        version.setTemplatesConfig(templatesJson);

        collectionVersionRepository.save(version);
    }

    // ==================== DETECCIÓN DE DIRECTORIOS Y SLUGS ====================

    private List<File> findExerciseDirectories(File catalogDir) {
        List<File> list = new ArrayList<>();
        File exercisesDir = new File(catalogDir, "exercises");
        if (exercisesDir.exists() && exercisesDir.isDirectory()) {
            File[] subs = exercisesDir.listFiles(File::isDirectory);
            if (subs != null) {
                Arrays.sort(subs, Comparator.comparing(File::getName));
                list.addAll(Arrays.asList(subs));
            }
        } else if (new File(catalogDir, "exercise.yaml").exists() || new File(catalogDir, "statement.md").exists()) {
            list.add(catalogDir);
        }
        return list;
    }

    private List<File> findCollectionDirectories(File catalogDir) {
        List<File> list = new ArrayList<>();
        File collectionsDir = new File(catalogDir, "collections");
        if (collectionsDir.exists() && collectionsDir.isDirectory()) {
            File[] subs = collectionsDir.listFiles(File::isDirectory);
            if (subs != null) {
                Arrays.sort(subs, Comparator.comparing(File::getName));
                list.addAll(Arrays.asList(subs));
            }
        }
        return list;
    }

    private String resolveExerciseSlug(File exDir) {
        File yamlFile = new File(exDir, "exercise.yaml");
        if (yamlFile.exists()) {
            try {
                JsonNode yamlNode = yamlMapper.readTree(yamlFile);
                if (yamlNode.has("id") && !yamlNode.path("id").asText().isBlank()) {
                    return yamlNode.path("id").asText().trim();
                }
            } catch (Exception ignored) {}
        }
        return exDir.getName();
    }

    private String resolveExerciseTitle(File exDir, String defaultTitle) {
        File yamlFile = new File(exDir, "exercise.yaml");
        if (yamlFile.exists()) {
            try {
                JsonNode yamlNode = yamlMapper.readTree(yamlFile);
                if (yamlNode.has("title") && !yamlNode.path("title").asText().isBlank()) {
                    return yamlNode.path("title").asText().trim();
                }
            } catch (Exception ignored) {}
        }
        File stmt = new File(exDir, "statement.md");
        return contentSyncService.extractTitle(stmt, defaultTitle);
    }

    private String resolveCollectionSlug(File colDir) {
        File yamlFile = new File(colDir, "collection.yaml");
        if (yamlFile.exists()) {
            try {
                JsonNode yamlNode = yamlMapper.readTree(yamlFile);
                if (yamlNode.has("id") && !yamlNode.path("id").asText().isBlank()) {
                    return yamlNode.path("id").asText().trim();
                }
                if (yamlNode.has("slug") && !yamlNode.path("slug").asText().isBlank()) {
                    return yamlNode.path("slug").asText().trim();
                }
            } catch (Exception ignored) {}
        }
        return colDir.getName();
    }

    private String resolveCollectionTitle(File colDir, String defaultTitle) {
        File yamlFile = new File(colDir, "collection.yaml");
        if (yamlFile.exists()) {
            try {
                JsonNode yamlNode = yamlMapper.readTree(yamlFile);
                if (yamlNode.has("title") && !yamlNode.path("title").asText().isBlank()) {
                    return yamlNode.path("title").asText().trim();
                }
            } catch (Exception ignored) {}
        }
        return defaultTitle;
    }

    public String generateNextExerciseSlug(String originalSlug, Set<String> reservedInBatch) {
        String base = stripTrailingNumber(originalSlug);
        int counter = 2;
        while (true) {
            String candidate = base + "-" + counter;
            if (!reservedInBatch.contains(candidate) && exerciseRepository.findBySlug(candidate).isEmpty()) {
                return candidate;
            }
            counter++;
        }
    }

    public String generateNextCollectionSlug(String originalSlug, Set<String> reservedInBatch) {
        String base = stripTrailingNumber(originalSlug);
        int counter = 2;
        while (true) {
            String candidate = base + "-" + counter;
            if (!reservedInBatch.contains(candidate) && collectionRepository.findBySlug(candidate).isEmpty()) {
                return candidate;
            }
            counter++;
        }
    }

    private String stripTrailingNumber(String slug) {
        if (slug != null && slug.matches("^(.+)-(\\d+)$")) {
            return slug.replaceAll("-(\\d+)$", "");
        }
        return slug;
    }

    private File resolveTargetDirectory(File repoDir, String rootPath) {
        if (rootPath == null || rootPath.trim().isEmpty() || "/".equals(rootPath.trim())) {
            return repoDir;
        }
        String cleanPath = rootPath.trim();
        while (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }
        while (cleanPath.endsWith("/")) {
            cleanPath = cleanPath.substring(0, cleanPath.length() - 1);
        }
        return new File(repoDir, cleanPath);
    }

    private void validateZipFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("El archivo ZIP no puede estar vacío");
        }
        String name = file.getOriginalFilename();
        if (name != null && !name.toLowerCase().endsWith(".zip")) {
            throw new ValidationException("El archivo seleccionado debe ser un archivo ZIP (.zip)");
        }
    }

    private void extractZip(InputStream inputStream, File destinationDir) throws IOException {
        String canonicalDestDirPath = destinationDir.getCanonicalPath();
        try (ZipInputStream zis = new ZipInputStream(inputStream, StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String entryName = entry.getName();
                // Ignorar metadatos de macOS o archivos ocultos de sistema
                if (entryName.startsWith("__MACOSX") || entryName.contains("/__MACOSX/") || entryName.endsWith(".DS_Store")) {
                    zis.closeEntry();
                    continue;
                }

                File targetFile = new File(destinationDir, entryName);
                String canonicalTargetFilePath = targetFile.getCanonicalPath();

                // Protección contra vulnerabilidad Zip Slip (Path Traversal)
                if (!canonicalTargetFilePath.startsWith(canonicalDestDirPath + File.separator) &&
                    !canonicalTargetFilePath.equals(canonicalDestDirPath)) {
                    throw new SecurityException("Entrada ZIP sospechosa (Zip Slip): " + entryName);
                }

                if (entry.isDirectory()) {
                    targetFile.mkdirs();
                } else {
                    File parent = targetFile.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }
                    try (OutputStream os = Files.newOutputStream(targetFile.toPath())) {
                        zis.transferTo(os);
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private File findCatalogBaseDir(File baseDir) {
        if (hasCatalogMarkers(baseDir)) {
            return baseDir;
        }
        Queue<File> queue = new ArrayDeque<>();
        queue.add(baseDir);
        int depth = 0;
        while (!queue.isEmpty() && depth < 4) {
            int levelSize = queue.size();
            for (int i = 0; i < levelSize; i++) {
                File current = queue.poll();
                if (hasCatalogMarkers(current)) {
                    return current;
                }
                File[] children = current.listFiles(File::isDirectory);
                if (children != null) {
                    for (File child : children) {
                        if (!child.getName().startsWith(".") && !child.getName().equals("__MACOSX")) {
                            queue.add(child);
                        }
                    }
                }
            }
            depth++;
        }
        return baseDir;
    }

    private boolean hasCatalogMarkers(File dir) {
        return new File(dir, "exercises").isDirectory() ||
               new File(dir, "collections").isDirectory() ||
               new File(dir, "exercise.yaml").isFile() ||
               new File(dir, "statement.md").isFile();
    }
}

