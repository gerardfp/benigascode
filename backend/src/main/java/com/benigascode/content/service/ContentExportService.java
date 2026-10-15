package com.benigascode.content.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ContentExportService {

    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final ExerciseAssetRepository exerciseAssetRepository;
    private final ObjectMapper objectMapper;
    private final ObjectMapper yamlMapper;

    public ContentExportService(CollectionRepository collectionRepository,
                                CollectionVersionRepository collectionVersionRepository,
                                ExerciseRepository exerciseRepository,
                                ExerciseVersionRepository exerciseVersionRepository,
                                ExerciseAssetRepository exerciseAssetRepository,
                                ObjectMapper objectMapper) {
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.exerciseAssetRepository = exerciseAssetRepository;
        this.objectMapper = objectMapper;
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
    }

    @Transactional
    public byte[] exportCollectionZip(UUID collectionId) throws Exception {
        Collection col = collectionRepository.findById(collectionId)
                .or(() -> collectionVersionRepository.findById(collectionId).map(CollectionVersion::getCollection))
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        CollectionVersion colVer = collectionVersionRepository.findLatestByCollectionId(col.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión de colección no disponible"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String colDir = "collections/" + col.getSlug() + "/";

            // 1. collection.yaml
            StringBuilder yamlBuilder = new StringBuilder();
            yamlBuilder.append("id: ").append(col.getSlug()).append("\n");
            yamlBuilder.append("title: \"").append(colVer.getTitle().replace("\"", "\\\"")).append("\"\n");
            yamlBuilder.append("slug: ").append(col.getSlug()).append("\n");
            yamlBuilder.append("description: \"").append(colVer.getDescription() != null ? colVer.getDescription().replace("\"", "\\\"") : "").append("\"\n");
            yamlBuilder.append("visibility: ").append(col.getVisibility()).append("\n");

            // Defaults
            yamlBuilder.append("language: java\n");
            yamlBuilder.append("runtime: java-21\n");
            yamlBuilder.append("compile:\n  command: javac Main.java\n  timeout_seconds: 15\n");
            yamlBuilder.append("execution:\n  command: java Main\n  timeout_seconds: 3\n  memory_limit_mb: 256\n");
            yamlBuilder.append("scoring:\n  mode: weighted\n  total_score: 100\n");
            yamlBuilder.append("comparator:\n  type: exact_line_by_line\n  ignore_trailing_whitespace: true\n");

            // Items
            yamlBuilder.append("items:\n");
            List<String> exerciseSlugs = new ArrayList<>();
            if (colVer.getItems() != null && !colVer.getItems().isBlank()) {
                try {
                    JsonNode itemsNode = objectMapper.readTree(colVer.getItems());
                    if (itemsNode.isArray()) {
                        for (JsonNode it : itemsNode) {
                            String exSlug = it.path("id").asText();
                            int pos = it.path("position").asInt(1);
                            boolean req = it.path("required").asBoolean(true);
                            double wt = it.path("weight").asDouble(1.0);

                            yamlBuilder.append("- type: EXERCISE\n");
                            yamlBuilder.append("  id: ").append(exSlug).append("\n");
                            yamlBuilder.append("  position: ").append(pos).append("\n");
                            yamlBuilder.append("  required: ").append(req).append("\n");
                            yamlBuilder.append("  weight: ").append(wt).append("\n");

                            exerciseSlugs.add(exSlug);
                        }
                    }
                } catch (Exception ignored) {}
            }

            zos.putNextEntry(new ZipEntry(colDir + "collection.yaml"));
            zos.write(yamlBuilder.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // Templates de colección
            if (colVer.getTemplatesConfig() != null && !colVer.getTemplatesConfig().isBlank()) {
                try {
                    Map<String, String> tpls = objectMapper.readValue(colVer.getTemplatesConfig(), new TypeReference<>() {});
                    for (Map.Entry<String, String> entry : tpls.entrySet()) {
                        String rt = entry.getKey();
                        if (!rt.contains(".")) {
                            String filename = colDir + "templates/" + rt + ".java";
                            zos.putNextEntry(new ZipEntry(filename));
                            zos.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                            zos.closeEntry();
                        }
                    }
                } catch (Exception ignored) {}
            }

            // 2. Exportar cada ejercicio incluido en formato plano
            for (String exSlug : exerciseSlugs) {
                Optional<Exercise> exOpt = exerciseRepository.findBySlug(exSlug);
                if (exOpt.isPresent()) {
                    Exercise ex = exOpt.get();
                    Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
                    if (evOpt.isPresent()) {
                        writeExerciseFlatToZip(zos, ex, evOpt.get(), "exercises/", "exercises/assets/");
                    }
                }
            }
        }
        return baos.toByteArray();
    }

    @Transactional
    public byte[] exportExerciseZip(UUID exerciseId) throws Exception {
        Exercise ex = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        ExerciseVersion ev = exerciseVersionRepository.findLatestByExerciseId(ex.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no disponible"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            writeExerciseFlatToZip(zos, ex, ev, "exercises/", "exercises/assets/");
        }
        return baos.toByteArray();
    }

    // ==================== EXPORTACIÓN A DISCO / DIRECTORIO ====================

    @Transactional
    public void exportAllToDirectory(File baseDir) throws Exception {
        File exercisesDir = new File(baseDir, "exercises");
        File assetsDir = new File(exercisesDir, "assets");
        File collectionsDir = new File(baseDir, "collections");

        exercisesDir.mkdirs();
        assetsDir.mkdirs();
        collectionsDir.mkdirs();

        List<Exercise> exercises = exerciseRepository.findAll();
        for (Exercise ex : exercises) {
            Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
            if (evOpt.isPresent()) {
                exportExerciseFlatToDirectory(ex, evOpt.get(), exercisesDir, assetsDir);
            }
        }

        List<Collection> collections = collectionRepository.findAll();
        for (Collection col : collections) {
            Optional<CollectionVersion> cvOpt = collectionVersionRepository.findLatestByCollectionId(col.getId());
            if (cvOpt.isPresent()) {
                File colDir = new File(collectionsDir, col.getSlug());
                exportCollectionToDirectory(col, cvOpt.get(), colDir);
            }
        }
    }

    public void exportExerciseFlatToDirectory(Exercise ex, ExerciseVersion ev, File exercisesDir, File assetsDir) throws Exception {
        List<ExerciseAsset> assets = exerciseAssetRepository.findByExerciseId(ex.getId());
        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport(ex.getSlug(), ev.getStatement(), ev.getTestsConfig(), assets, objectMapper);

        // 1. Exportar assets referenciados a exercises/assets/<slug>-img<N>.<ext>
        for (ExerciseAssetCatalogHelper.ExportedAssetItem item : prepared.referencedAssets()) {
            File af = new File(assetsDir, item.newFilename());
            Files.write(af.toPath(), item.asset().getData());
        }

        // 2. Escribir exercises/<slug>.md con statement y testsConfig reescritos
        File mdFile = new File(exercisesDir, ex.getSlug() + ".md");
        ExerciseVersion exportEv = cloneWithStatementAndTests(ev, prepared.updatedStatement(), prepared.updatedTestsConfig());
        String markdown = ExerciseMarkdownSerializer.serialize(ex, exportEv, objectMapper);
        Files.writeString(mdFile.toPath(), markdown, StandardCharsets.UTF_8);

        // 3. Persistir cambios en BD de forma segura evitando colisiones uq_exercise_asset_filename
        applyExportAssetChanges(prepared, ev);
    }

    private void writeExerciseFlatToZip(ZipOutputStream zos, Exercise ex, ExerciseVersion ev, String exercisesPrefix, String assetsPrefix) throws Exception {
        List<ExerciseAsset> assets = exerciseAssetRepository.findByExerciseId(ex.getId());
        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport(ex.getSlug(), ev.getStatement(), ev.getTestsConfig(), assets, objectMapper);

        for (ExerciseAssetCatalogHelper.ExportedAssetItem item : prepared.referencedAssets()) {
            zos.putNextEntry(new ZipEntry(assetsPrefix + item.newFilename()));
            zos.write(item.asset().getData());
            zos.closeEntry();
        }

        ExerciseVersion exportEv = cloneWithStatementAndTests(ev, prepared.updatedStatement(), prepared.updatedTestsConfig());
        String markdown = ExerciseMarkdownSerializer.serialize(ex, exportEv, objectMapper);
        zos.putNextEntry(new ZipEntry(exercisesPrefix + ex.getSlug() + ".md"));
        zos.write(markdown.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();

        applyExportAssetChanges(prepared, ev);
    }

    private void applyExportAssetChanges(ExerciseAssetCatalogHelper.PreparedExportAssets prepared, ExerciseVersion ev) {
        // 1. Purgar assets no referenciados de la base de datos y hacer flush inmediato para liberar los nombres
        if (!prepared.unreferencedAssets().isEmpty()) {
            exerciseAssetRepository.deleteAll(prepared.unreferencedAssets());
            exerciseAssetRepository.flush();
        }

        // 2. Renombrado seguro en 2 fases con flush() para evitar colisiones uq_exercise_asset_filename
        boolean anyChanged = false;
        for (ExerciseAssetCatalogHelper.ExportedAssetItem item : prepared.referencedAssets()) {
            if (!item.newFilename().equals(item.asset().getFilename())) {
                item.asset().setFilename("__tmp_" + UUID.randomUUID().toString().replace("-", "") + "_" + item.newFilename());
                exerciseAssetRepository.save(item.asset());
                anyChanged = true;
            }
        }
        if (anyChanged) {
            exerciseAssetRepository.flush();
        }

        for (ExerciseAssetCatalogHelper.ExportedAssetItem item : prepared.referencedAssets()) {
            if (!item.newFilename().equals(item.asset().getFilename())) {
                item.asset().setFilename(item.newFilename());
                exerciseAssetRepository.save(item.asset());
            }
        }
        if (anyChanged) {
            exerciseAssetRepository.flush();
        }

        // 3. Actualizar enunciado y testsConfig en versión si han cambiado
        boolean versionChanged = false;
        if (!Objects.equals(prepared.updatedStatement(), ev.getStatement())) {
            ev.setStatement(prepared.updatedStatement());
            versionChanged = true;
        }
        if (prepared.updatedTestsConfig() != null && !Objects.equals(prepared.updatedTestsConfig(), ev.getTestsConfig())) {
            ev.setTestsConfig(prepared.updatedTestsConfig());
            versionChanged = true;
        }
        if (versionChanged) {
            exerciseVersionRepository.save(ev);
        }
    }

    private ExerciseVersion cloneWithStatementAndTests(ExerciseVersion ev, String newStatement, String newTestsConfig) {
        ExerciseVersion v = new ExerciseVersion();
        v.setExercise(ev.getExercise());
        v.setVersionNumber(ev.getVersionNumber());
        v.setTitle(ev.getTitle());
        v.setStatement(newStatement);
        v.setDifficulty(ev.getDifficulty());
        v.setLanguage(ev.getLanguage());
        v.setRuntimeId(ev.getRuntimeId());
        v.setCompileConfig(ev.getCompileConfig());
        v.setRunConfig(ev.getRunConfig());
        v.setScoringConfig(ev.getScoringConfig());
        v.setComparatorConfig(ev.getComparatorConfig());
        v.setTestsConfig(newTestsConfig != null ? newTestsConfig : ev.getTestsConfig());
        v.setTemplatesConfig(ev.getTemplatesConfig());
        v.setTags(ev.getTags());
        v.setContentHash(ev.getContentHash());
        v.setGitCommit(ev.getGitCommit());
        v.setStatus(ev.getStatus());
        return v;
    }

    private ExerciseVersion cloneWithStatement(ExerciseVersion ev, String newStatement) {
        return cloneWithStatementAndTests(ev, newStatement, ev.getTestsConfig());
    }

    @Transactional
    public void exportExerciseToDirectory(Exercise ex, ExerciseVersion ev, File targetDir) throws Exception {
        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }
        File assetsDir = new File(targetDir, "assets");
        exportExerciseFlatToDirectory(ex, ev, targetDir, assetsDir);
    }

    public void exportCollectionToDirectory(Collection col, CollectionVersion colVer, File targetDir) throws Exception {
        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }

        File yamlFile = new File(targetDir, "collection.yaml");
        Map<String, Object> colMap = new LinkedHashMap<>();
        colMap.put("id", col.getSlug());
        colMap.put("title", colVer.getTitle());
        colMap.put("slug", col.getSlug());
        colMap.put("description", colVer.getDescription() != null ? colVer.getDescription() : "");
        colMap.put("visibility", col.getVisibility());

        // Defaults
        colMap.put("language", "java");
        colMap.put("runtime", "java-21");
        colMap.put("compile", Map.of("command", "javac Main.java", "timeout_seconds", 15));
        colMap.put("execution", Map.of("command", "java Main", "timeout_seconds", 3, "memory_limit_mb", 256));
        colMap.put("scoring", Map.of("mode", "weighted", "total_score", 100));
        colMap.put("comparator", Map.of("type", "exact_line_by_line", "ignore_trailing_whitespace", true));

        // Items
        if (colVer.getItems() != null && !colVer.getItems().isBlank()) {
            try {
                JsonNode itemsNode = objectMapper.readTree(colVer.getItems());
                if (itemsNode.isArray()) {
                    List<Map<String, Object>> itemsList = new ArrayList<>();
                    for (JsonNode it : itemsNode) {
                        Map<String, Object> itemMap = new LinkedHashMap<>();
                        itemMap.put("type", "EXERCISE");
                        itemMap.put("id", it.path("id").asText());
                        itemMap.put("position", it.path("position").asInt(1));
                        itemMap.put("required", it.path("required").asBoolean(true));
                        itemMap.put("weight", it.path("weight").asDouble(1.0));
                        itemsList.add(itemMap);
                    }
                    colMap.put("items", itemsList);
                }
            } catch (Exception ignored) {}
        }
        yamlMapper.writeValue(yamlFile, colMap);

        // Templates
        if (colVer.getTemplatesConfig() != null && !colVer.getTemplatesConfig().isBlank()) {
            try {
                Map<String, String> tpls = objectMapper.readValue(colVer.getTemplatesConfig(), new TypeReference<>() {});
                File tplDir = new File(targetDir, "templates");
                tplDir.mkdirs();
                for (Map.Entry<String, String> entry : tpls.entrySet()) {
                    String rt = entry.getKey();
                    if (!rt.contains(".")) {
                        File tf = new File(tplDir, rt + ".java");
                        Files.writeString(tf.toPath(), entry.getValue(), StandardCharsets.UTF_8);
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
