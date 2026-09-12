package com.benigascode.content.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
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
    }

    @Transactional(readOnly = true)
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
            yamlBuilder.append("description: \"").append(colVer.getDescription().replace("\"", "\\\"")).append("\"\n");
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

            // 2. Exportar cada ejercicio incluido
            for (String exSlug : exerciseSlugs) {
                Optional<Exercise> exOpt = exerciseRepository.findBySlug(exSlug);
                if (exOpt.isPresent()) {
                    Exercise ex = exOpt.get();
                    Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
                    if (evOpt.isPresent()) {
                        writeExerciseToZip(zos, ex, evOpt.get(), "exercises/" + ex.getSlug() + "/");
                    }
                }
            }
        }
        return baos.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] exportExerciseZip(UUID exerciseId) throws Exception {
        Exercise ex = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        ExerciseVersion ev = exerciseVersionRepository.findLatestByExerciseId(ex.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no disponible"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            writeExerciseToZip(zos, ex, ev, ex.getSlug() + "/");
        }
        return baos.toByteArray();
    }

    private void writeExerciseToZip(ZipOutputStream zos, Exercise ex, ExerciseVersion ev, String prefix) throws Exception {
        // 1. statement.md
        zos.putNextEntry(new ZipEntry(prefix + "statement.md"));
        String stmt = ev.getStatement() != null ? ev.getStatement() : "# " + ev.getTitle() + "\n";
        zos.write(stmt.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();

        // 2. templates/
        if (ev.getTemplatesConfig() != null && !ev.getTemplatesConfig().isBlank()) {
            try {
                Map<String, String> tpls = objectMapper.readValue(ev.getTemplatesConfig(), new TypeReference<>() {});
                for (Map.Entry<String, String> entry : tpls.entrySet()) {
                    String rt = entry.getKey();
                    if (!rt.contains(".")) {
                        zos.putNextEntry(new ZipEntry(prefix + "templates/" + rt + ".java"));
                        zos.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                        zos.closeEntry();
                    }
                }
            } catch (Exception ignored) {}
        }

        // 3. Tests (public-tests/ y private-tests/)
        if (ev.getTestsConfig() != null && !ev.getTestsConfig().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ev.getTestsConfig());
                writeTestsScope(zos, prefix + "public-tests/", root.path("public"));
                writeTestsScope(zos, prefix + "private-tests/", root.path("private"));
            } catch (Exception ignored) {}
        }

        // 4. Assets de imagen desde la BD
        List<ExerciseAsset> assets = exerciseAssetRepository.findByExerciseId(ex.getId());
        for (ExerciseAsset asset : assets) {
            zos.putNextEntry(new ZipEntry(prefix + asset.getFilename()));
            zos.write(asset.getData());
            zos.closeEntry();
        }
    }

    private void writeTestsScope(ZipOutputStream zos, String scopePrefix, JsonNode testsNode) throws Exception {
        if (!testsNode.isArray()) return;
        int idx = 0;
        for (JsonNode t : testsNode) {
            String dirName = String.format("%02d", idx++);
            String testFolder = scopePrefix + dirName + "/";

            // input.txt
            zos.putNextEntry(new ZipEntry(testFolder + "input.txt"));
            zos.write(t.path("input").asText("").getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // output.txt
            zos.putNextEntry(new ZipEntry(testFolder + "output.txt"));
            zos.write(t.path("expected").asText("").getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // weight-{val}
            double w = t.path("weight").asDouble(10.0);
            String wStr = (w == (long) w) ? String.format("%d", (long) w) : String.valueOf(w);
            zos.putNextEntry(new ZipEntry(testFolder + "weight-" + wStr));
            zos.closeEntry();

            // explanation.md
            if (t.has("explanation") && !t.get("explanation").isNull() && !t.get("explanation").asText().isBlank()) {
                zos.putNextEntry(new ZipEntry(testFolder + "explanation.md"));
                zos.write(t.get("explanation").asText().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
    }
}
