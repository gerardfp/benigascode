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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.*;

@Service
public class ContentSyncService {

    private static final Logger log = LoggerFactory.getLogger(ContentSyncService.class);

    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final ExerciseAssetRepository exerciseAssetRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ContentSyncRepository contentSyncRepository;
    private final ObjectMapper jsonMapper;
    private final ObjectMapper yamlMapper;

    @Value("${benigascode.content.storage-path:content-example}")
    private String contentRootPath;

    public static class CollectionDefaults {
        public String language = "java";
        public String runtimeId = "java-21";
        public String compileJson = "{\"command\":\"javac Main.java\",\"timeout_seconds\":15}";
        public String runJson = "{\"command\":\"java Main\",\"timeout_seconds\":3,\"memory_limit_mb\":256}";
        public String scoringJson = "{\"mode\":\"weighted\",\"total_score\":100}";
        public String comparatorJson = "{\"type\":\"exact_line_by_line\",\"ignore_trailing_whitespace\":true}";
    }

    public ContentSyncService(ExerciseRepository exerciseRepository,
                              ExerciseVersionRepository exerciseVersionRepository,
                              ExerciseAssetRepository exerciseAssetRepository,
                              CollectionRepository collectionRepository,
                              CollectionVersionRepository collectionVersionRepository,
                              ContentSyncRepository contentSyncRepository,
                              ObjectMapper jsonMapper) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.exerciseAssetRepository = exerciseAssetRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.contentSyncRepository = contentSyncRepository;
        this.jsonMapper = jsonMapper;
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
    }

    public ObjectMapper getJsonMapper() {
        return jsonMapper;
    }

    public ObjectMapper getYamlMapper() {
        return yamlMapper;
    }

    @Transactional
    public ContentSync syncFromDirectory(String directoryPath, String commitHash) {
        String targetPath = (directoryPath != null && !directoryPath.isBlank()) ? directoryPath : contentRootPath;
        File rootDir = new File(targetPath);
        if (!rootDir.exists() || !rootDir.isDirectory()) {
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
            // 1. Precargar defaults de colecciones para herencia
            Map<String, CollectionDefaults> exerciseSlugToDefaults = new HashMap<>();
            CollectionDefaults defaultCollectionDefaults = new CollectionDefaults();

            File collectionsDir = new File(rootDir, "collections");
            if (collectionsDir.exists() && collectionsDir.isDirectory()) {
                for (File colDir : Objects.requireNonNull(collectionsDir.listFiles(File::isDirectory))) {
                    File colYaml = new File(colDir, "collection.yaml");
                    if (!colYaml.exists()) continue;
                    try {
                        JsonNode colNode = yamlMapper.readTree(colYaml);
                        CollectionDefaults cd = new CollectionDefaults();
                        if (colNode.has("language")) {
                            cd.language = colNode.get("language").asText("java");
                        }
                        if (colNode.has("runtime")) {
                            cd.runtimeId = colNode.get("runtime").asText("java-21");
                        }
                        if (colNode.has("compile")) {
                            cd.compileJson = jsonMapper.writeValueAsString(colNode.get("compile"));
                        }
                        if (colNode.has("execution")) {
                            cd.runJson = jsonMapper.writeValueAsString(colNode.get("execution"));
                        }
                        if (colNode.has("scoring")) {
                            cd.scoringJson = jsonMapper.writeValueAsString(colNode.get("scoring"));
                        }
                        if (colNode.has("comparator")) {
                            cd.comparatorJson = jsonMapper.writeValueAsString(colNode.get("comparator"));
                        }

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
                        log.warn("No se pudieron precargar defaults de colección " + colDir.getName(), ex);
                    }
                }
            }

            // 2. Sincronizar Ejercicios
            File exercisesDir = new File(rootDir, "exercises");
            if (exercisesDir.exists() && exercisesDir.isDirectory()) {
                File[] exDirs = exercisesDir.listFiles(f -> f.isDirectory() && new File(f, "exercise.md").exists());
                if (exDirs != null) {
                    for (File exDir : exDirs) {
                        try {
                            CollectionDefaults colDefaults = exerciseSlugToDefaults.getOrDefault(exDir.getName(), defaultCollectionDefaults);
                            String versionInfo = syncExercise(exDir, sync.getGitCommit(), colDefaults);
                            if (versionInfo != null) {
                                createdVersions.add(versionInfo);
                            }
                        } catch (Exception ex) {
                            log.error("Error al sincronizar ejercicio: " + exDir.getName(), ex);
                            errors.add("Ejercicio " + exDir.getName() + ": " + ex.getMessage());
                        }
                    }
                }
            }

            // 3. Sincronizar Colecciones
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

    private String syncExercise(File exerciseDir, String gitCommit, CollectionDefaults colDefaults) throws Exception {
        File mdFile = new File(exerciseDir, "exercise.md");
        if (!mdFile.exists()) {
            return null;
        }

        String rawContent = Files.readString(mdFile.toPath(), StandardCharsets.UTF_8);
        ExerciseMarkdownParser.ParseResult parseResult = ExerciseMarkdownParser.parse(rawContent, exerciseDir.getName());
        ExerciseMarkdownParser.ParsedExercise pe = parseResult.exercise();

        String slug = (pe.slug() != null && !pe.slug().isBlank()) ? pe.slug() : exerciseDir.getName();
        String title = pe.title();
        String statement = pe.statement();

        // Determinar lenguaje y runtime según plantillas definidas o defaults
        String language = colDefaults.language;
        String runtimeId = colDefaults.runtimeId;
        if (pe.templates() != null && !pe.templates().isEmpty()) {
            if (pe.templates().containsKey("java")) {
                language = "java";
                runtimeId = "java-26";
            } else if (pe.templates().containsKey("python")) {
                language = "python";
                runtimeId = "python-314";
            } else {
                String firstLang = pe.templates().keySet().iterator().next();
                language = firstLang;
                runtimeId = firstLang.startsWith("py") ? "python-314" : "java-26";
            }
        }

        // Construir test suite JSON
        Map<String, Object> testSuite = new HashMap<>();
        List<Map<String, Object>> pubTests = new ArrayList<>();
        List<Map<String, Object>> privTests = new ArrayList<>();
        if (pe.testCases() != null) {
            int pubIdx = 1;
            int privIdx = 1;
            for (com.benigascode.content.dto.TestCaseDTO tc : pe.testCases()) {
                Map<String, Object> t = new HashMap<>();
                t.put("id", tc.id() != null && !tc.id().isBlank() ? tc.id() : (tc.isPublic() ? "pub-" + pubIdx : "priv-" + privIdx));
                t.put("name", tc.name() != null && !tc.name().isBlank() ? tc.name() : (tc.isPublic() ? "Test Público #" + pubIdx : "Test Privado #" + privIdx));
                t.put("input", tc.input() != null ? tc.input() : "");
                t.put("expected", tc.effectiveExpected());
                t.put("weight", tc.weight() > 0 ? tc.weight() : 1.0);
                t.put("is_public", tc.isPublic());
                if (tc.explanation() != null && !tc.explanation().isBlank()) {
                    t.put("explanation", tc.explanation());
                }

                if (tc.isPublic()) {
                    pubTests.add(t);
                    pubIdx++;
                } else {
                    privTests.add(t);
                    privIdx++;
                }
            }
        }
        testSuite.put("public", pubTests);
        testSuite.put("private", privTests);
        String testsJson = jsonMapper.writeValueAsString(testSuite);

        String compileJson = colDefaults.compileJson;
        String runJson = colDefaults.runJson;
        String scoringJson = colDefaults.scoringJson;
        String comparatorJson = colDefaults.comparatorJson;

        String templatesJson = jsonMapper.writeValueAsString(pe.templates() != null ? pe.templates() : Map.of());
        String tagsJson = jsonMapper.writeValueAsString(pe.tags() != null ? pe.tags() : List.of());

        // Calcular Hash del contenido
        String contentHash = computeHash(statement + testsJson + compileJson + runJson + templatesJson + tagsJson);

        Exercise exercise = exerciseRepository.findBySlug(slug)
                .orElseGet(() -> exerciseRepository.save(new Exercise(slug)));

        syncAssets(exercise, exerciseDir);

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
        version.setTags(tagsJson);
        version.setContentHash(contentHash);
        version.setGitCommit(gitCommit);
        version.setStatus("PUBLISHED");

        exerciseVersionRepository.save(version);
        return "Exercise: " + slug + " (v" + nextVersion + ")";
    }

    public void syncAssets(Exercise exercise, File exerciseDir) {
        File[] files = exerciseDir.listFiles(File::isFile);
        if (files != null) {
            for (File f : files) {
                String name = f.getName().toLowerCase();
                if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") ||
                    name.endsWith(".gif") || name.endsWith(".svg") || name.endsWith(".webp")) {
                    try {
                        byte[] data = Files.readAllBytes(f.toPath());
                        String contentType = determineContentType(name);
                        Optional<ExerciseAsset> existing = exerciseAssetRepository.findByExerciseIdAndFilename(exercise.getId(), f.getName());
                        if (existing.isPresent()) {
                            ExerciseAsset asset = existing.get();
                            asset.setData(data);
                            asset.setContentType(contentType);
                            asset.setSizeBytes(data.length);
                            exerciseAssetRepository.save(asset);
                        } else {
                            ExerciseAsset asset = new ExerciseAsset(exercise, f.getName(), contentType, data);
                            exerciseAssetRepository.save(asset);
                        }
                    } catch (Exception ex) {
                        log.warn("Error importando asset " + f.getName() + " para ejercicio " + exercise.getSlug(), ex);
                    }
                }
            }
        }
    }

    private String determineContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    public String syncCollection(File colDir) throws Exception {
        File yamlFile = new File(colDir, "collection.yaml");
        if (!yamlFile.exists()) return null;

        JsonNode yamlNode = yamlMapper.readTree(yamlFile);
        String slug = yamlNode.path("id").asText(colDir.getName());
        String title = yamlNode.path("title").asText(slug);
        String description = yamlNode.path("description").asText("");
        String visibility = yamlNode.path("visibility").asText("PRIVATE").toUpperCase();
        String itemsJson = jsonMapper.writeValueAsString(yamlNode.path("items"));
        String templatesJson = "{}";

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

    public Map<String, String> loadTemplates(File baseDir, JsonNode yamlNode) throws Exception {
        Map<String, String> templates = new LinkedHashMap<>();

        // 1. Escaneo de carpeta templates/
        File templatesDir = new File(baseDir, "templates");
        if (templatesDir.exists() && templatesDir.isDirectory()) {
            File[] files = templatesDir.listFiles(File::isFile);
            if (files != null) {
                Arrays.sort(files, Comparator.comparing(File::getName));
                for (File f : files) {
                    String fname = f.getName();
                    String runtime = fname.contains(".") ? fname.substring(0, fname.lastIndexOf('.')) : fname;
                    String code = Files.readString(f.toPath());
                    templates.put(runtime, code);
                    templates.put(fname, code);
                    if (runtime.startsWith("java")) {
                        templates.putIfAbsent("java", code);
                    } else if (runtime.startsWith("python")) {
                        templates.putIfAbsent("python", code);
                    }
                }
            }
        }

        // 2. Compatibilidad con templates: inline en YAML
        if (yamlNode != null) {
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

                    for (String rt : runtimes) {
                        templates.put(rt, code);
                    }
                }
            }
        }
        return templates;
    }

    public String computeHash(String data) throws Exception {
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
