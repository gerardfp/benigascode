package com.benigascode.content.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

@Service
public class ContentSyncService {

    private static final Logger log = LoggerFactory.getLogger(ContentSyncService.class);

    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ContentSyncRepository contentSyncRepository;
    private final ObjectMapper jsonMapper;
    private final ObjectMapper yamlMapper;

    @Value("${benigascode.content.storage-path:content-example}")
    private String contentRootPath;

    public ContentSyncService(ExerciseRepository exerciseRepository,
                              ExerciseVersionRepository exerciseVersionRepository,
                              CollectionRepository collectionRepository,
                              CollectionVersionRepository collectionVersionRepository,
                              ContentSyncRepository contentSyncRepository,
                              ObjectMapper jsonMapper) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.contentSyncRepository = contentSyncRepository;
        this.jsonMapper = jsonMapper;
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
    }

    @Transactional
    public ContentSync syncFromDirectory(String directoryPath, String commitHash) {
        String targetPath = (directoryPath != null && !directoryPath.isBlank()) ? directoryPath : contentRootPath;
        File rootDir = new File(targetPath);
        if (!rootDir.exists() || !rootDir.isDirectory()) {
            // Intentar buscar relativo al workspace
            File fallback = new File("content-example");
            if (fallback.exists()) {
                rootDir = fallback;
            } else {
                throw new ValidationException("Directorio de contenidos no encontrado: " + targetPath);
            }
        }

        ContentSync sync = new ContentSync(commitHash != null ? commitHash : "local_commit_" + System.currentTimeMillis());
        sync = contentSyncRepository.save(sync);

        List<String> errors = new ArrayList<>();
        List<String> createdVersions = new ArrayList<>();

        try {
            // 1. Sincronizar Ejercicios
            File exercisesDir = new File(rootDir, "exercises");
            if (exercisesDir.exists() && exercisesDir.isDirectory()) {
                for (File exDir : Objects.requireNonNull(exercisesDir.listFiles(File::isDirectory))) {
                    try {
                        String versionInfo = syncExercise(exDir, sync.getGitCommit());
                        if (versionInfo != null) {
                            createdVersions.add(versionInfo);
                        }
                    } catch (Exception ex) {
                        log.error("Error al sincronizar ejercicio: " + exDir.getName(), ex);
                        errors.add("Ejercicio " + exDir.getName() + ": " + ex.getMessage());
                    }
                }
            }

            // 2. Sincronizar Colecciones
            File collectionsDir = new File(rootDir, "collections");
            if (collectionsDir.exists() && collectionsDir.isDirectory()) {
                for (File colDir : Objects.requireNonNull(collectionsDir.listFiles(File::isDirectory))) {
                    try {
                        String colInfo = syncCollection(colDir);
                        if (colInfo != null) {
                            createdVersions.add(colInfo);
                        }
                    } catch (Exception ex) {
                        log.error("Error al sincronizar colección: " + colDir.getName(), ex);
                        errors.add("Colección " + colDir.getName() + ": " + ex.getMessage());
                    }
                }
            }

            String status = errors.isEmpty() ? "SUCCESS" : (createdVersions.isEmpty() ? "FAILED" : "WARNING");
            sync.finish(status, jsonMapper.writeValueAsString(errors), jsonMapper.writeValueAsString(createdVersions));
            return contentSyncRepository.save(sync);

        } catch (Exception e) {
            log.error("Error crítico durante la sincronización", e);
            try {
                sync.finish("FAILED", jsonMapper.writeValueAsString(List.of(e.getMessage())), "[]");
                return contentSyncRepository.save(sync);
            } catch (Exception ignored) {
                throw new RuntimeException(e);
            }
        }
    }

    private String syncExercise(File exerciseDir, String gitCommit) throws Exception {
        File yamlFile = new File(exerciseDir, "exercise.yaml");
        if (!yamlFile.exists()) {
            return null;
        }

        JsonNode yamlNode = yamlMapper.readTree(yamlFile);
        String slug = yamlNode.path("id").asText(exerciseDir.getName());
        String title = yamlNode.path("title").asText(slug);
        String language = yamlNode.path("language").asText("java");
        String runtimeId = yamlNode.path("runtime").asText("java-21");

        File statementFile = new File(exerciseDir, "statement.md");
        String statement = statementFile.exists() ? Files.readString(statementFile.toPath()) : "Sin enunciado";

        // Cargar tests estructurados
        Map<String, Object> testSuite = loadTestSuite(exerciseDir, yamlNode);
        String testsJson = jsonMapper.writeValueAsString(testSuite);
        String compileJson = jsonMapper.writeValueAsString(yamlNode.path("compile"));
        String runJson = jsonMapper.writeValueAsString(yamlNode.path("execution"));
        String scoringJson = jsonMapper.writeValueAsString(yamlNode.path("scoring"));
        String comparatorJson = jsonMapper.writeValueAsString(yamlNode.path("comparator"));
        String templatesJson = jsonMapper.writeValueAsString(loadTemplates(exerciseDir, yamlNode));

        // Calcular Hash del contenido
        String contentHash = computeHash(statement + testsJson + compileJson + runJson + templatesJson);

        Exercise exercise = exerciseRepository.findBySlug(slug)
                .orElseGet(() -> exerciseRepository.save(new Exercise(slug)));

        Optional<ExerciseVersion> latest = exerciseVersionRepository.findLatestByExerciseId(exercise.getId());
        if (latest.isPresent() && latest.get().getContentHash().equals(contentHash)) {
            // El contenido no ha cambiado, no duplicar versión
            return null;
        }

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
        return "Exercise: " + slug + " (v" + nextVersion + ")";
    }

    private Map<String, Object> loadTestSuite(File exerciseDir, JsonNode yamlNode) throws Exception {
        Map<String, Object> suite = new HashMap<>();
        List<Map<String, Object>> publicTests = new ArrayList<>();
        List<Map<String, Object>> privateTests = new ArrayList<>();

        JsonNode testsNode = yamlNode.path("tests");
        for (JsonNode tNode : testsNode.path("public")) {
            publicTests.add(loadSingleTest(exerciseDir, tNode, true));
        }
        for (JsonNode tNode : testsNode.path("private")) {
            privateTests.add(loadSingleTest(exerciseDir, tNode, false));
        }

        suite.put("public", publicTests);
        suite.put("private", privateTests);
        return suite;
    }

    private Map<String, Object> loadSingleTest(File exerciseDir, JsonNode tNode, boolean isPublic) throws Exception {
        String id = tNode.path("id").asText();
        String name = tNode.path("name").asText(id);
        double weight = tNode.path("weight").asDouble(10.0);
        String inputFile = tNode.path("input").asText();
        String expectedFile = tNode.path("expected").asText();

        String inputContent = "";
        String expectedContent = "";

        File inF = new File(exerciseDir, inputFile);
        if (inF.exists()) {
            inputContent = Files.readString(inF.toPath());
        }
        File outF = new File(exerciseDir, expectedFile);
        if (outF.exists()) {
            expectedContent = Files.readString(outF.toPath());
        }

        Map<String, Object> test = new HashMap<>();
        test.put("id", id);
        test.put("name", name);
        test.put("weight", weight);
        test.put("input", inputContent);
        test.put("expected", expectedContent);
        test.put("is_public", isPublic);
        return test;
    }

    private String syncCollection(File colDir) throws Exception {
        File yamlFile = new File(colDir, "collection.yaml");
        if (!yamlFile.exists()) return null;

        JsonNode yamlNode = yamlMapper.readTree(yamlFile);
        String slug = yamlNode.path("id").asText(colDir.getName());
        String title = yamlNode.path("title").asText(slug);
        String description = yamlNode.path("description").asText("");
        String visibility = yamlNode.path("visibility").asText("PRIVATE").toUpperCase();
        String itemsJson = jsonMapper.writeValueAsString(yamlNode.path("items"));
        String templatesJson = jsonMapper.writeValueAsString(loadTemplates(colDir, yamlNode));

        Collection collection = collectionRepository.findBySlug(slug)
                .orElseGet(() -> collectionRepository.save(new Collection(slug, visibility)));

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
        return "Collection: " + slug + " (v" + nextVersion + ")";
    }

    private Map<String, String> loadTemplates(File baseDir, JsonNode yamlNode) throws Exception {
        Map<String, String> templates = new LinkedHashMap<>();
        JsonNode templatesNode = yamlNode.path("templates");
        if (templatesNode.isArray()) {
            for (JsonNode tNode : templatesNode) {
                String code = null;
                if (tNode.has("empty") && tNode.get("empty").asBoolean()) {
                    code = "";
                } else if (tNode.has("code")) {
                    code = tNode.get("code").asText("");
                } else if (tNode.has("file")) {
                    File f = new File(baseDir, tNode.get("file").asText());
                    if (f.exists()) {
                        code = Files.readString(f.toPath());
                    } else {
                        code = "";
                    }
                } else if (tNode.has("template")) {
                    File f = new File(baseDir, tNode.get("template").asText());
                    if (f.exists()) {
                        code = Files.readString(f.toPath());
                    } else {
                        code = "";
                    }
                }

                if (code == null) {
                    code = "";
                }

                List<String> runtimes = new ArrayList<>();
                if (tNode.has("runtimes") && tNode.get("runtimes").isArray()) {
                    for (JsonNode r : tNode.get("runtimes")) {
                        runtimes.add(r.asText());
                    }
                } else if (tNode.has("runtime")) {
                    runtimes.add(tNode.get("runtime").asText());
                }

                // La última plantilla especificada para un runtime sobreescribe a las anteriores
                for (String rt : runtimes) {
                    templates.put(rt, code);
                }
            }
        }
        return templates;
    }

    private String computeHash(String data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data.getBytes());
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}

