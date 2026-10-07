package com.benigascode.content.service;

import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.dto.TestCaseDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class ExerciseMarkdownSerializer {

    public static String serialize(Exercise exercise, ExerciseVersion version, ObjectMapper objectMapper) {
        String title = version.getTitle() != null ? version.getTitle() : "Ejercicio";
        String slug = exercise != null && exercise.getSlug() != null ? exercise.getSlug() : "";
        String statement = version.getStatement() != null ? version.getStatement() : "";

        List<String> tags = new ArrayList<>();
        if (version.getTags() != null && !version.getTags().isBlank()) {
            try {
                tags = objectMapper.readValue(version.getTags(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }

        Map<String, String> templates = new LinkedHashMap<>();
        if (version.getTemplatesConfig() != null && !version.getTemplatesConfig().isBlank()) {
            try {
                Map<String, String> parsed = objectMapper.readValue(version.getTemplatesConfig(), new TypeReference<Map<String, String>>() {});
                for (Map.Entry<String, String> e : parsed.entrySet()) {
                    if (e.getValue() != null && !e.getValue().isBlank()) {
                        String rawK = e.getKey().toLowerCase().trim();
                        String normK = (rawK.startsWith("python") || rawK.equals("py")) ? "python" : (rawK.startsWith("java") ? "java" : rawK);
                        templates.putIfAbsent(normK, e.getValue());
                    }
                }
            } catch (Exception ignored) {}
        }

        List<TestCaseDTO> testCases = new ArrayList<>();
        if (version.getTestsConfig() != null && !version.getTestsConfig().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(version.getTestsConfig());
                int idx = 0;
                if (root.has("public") && root.get("public").isArray()) {
                    for (JsonNode t : root.get("public")) {
                        testCases.add(new TestCaseDTO(
                                t.path("id").asText("pub-" + (idx + 1)),
                                t.path("name").asText("Test Público #" + (idx + 1)),
                                true,
                                idx++,
                                t.path("weight").asDouble(1.0),
                                t.path("input").asText(""),
                                t.path("expected").asText(""),
                                t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                        ));
                    }
                }
                if (root.has("private") && root.get("private").isArray()) {
                    for (JsonNode t : root.get("private")) {
                        testCases.add(new TestCaseDTO(
                                t.path("id").asText("priv-" + (idx + 1)),
                                t.path("name").asText("Test Privado #" + (idx + 1)),
                                false,
                                idx++,
                                t.path("weight").asDouble(1.0),
                                t.path("input").asText(""),
                                t.path("expected").asText(""),
                                t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                        ));
                    }
                }
            } catch (Exception ignored) {}
        }

        return serialize(title, slug, tags, statement, templates, testCases);
    }

    public static String serialize(String title,
                                    String slug,
                                    List<String> tags,
                                    String statement,
                                    Map<String, String> templates,
                                    List<TestCaseDTO> testCases) {
        StringBuilder sb = new StringBuilder();

        String cleanSlug = (slug != null) ? slug.trim() : "";
        List<String> cleanTags = (tags != null) ? tags.stream().filter(t -> t != null && !t.isBlank()).toList() : List.of();

        // 1. Frontmatter
        if (!cleanSlug.isEmpty() || !cleanTags.isEmpty()) {
            sb.append("---\n");
            if (!cleanSlug.isEmpty()) {
                sb.append("slug: ").append(cleanSlug).append("\n");
            }
            if (!cleanTags.isEmpty()) {
                sb.append("tags: [").append(String.join(", ", cleanTags)).append("]\n");
            }
            sb.append("---\n");
        }

        // 2. Título
        String cleanTitle = (title != null && !title.isBlank()) ? title.trim() : "Ejercicio";
        sb.append("# ").append(cleanTitle).append("\n\n");

        // 3. Enunciado
        String cleanStatement = (statement != null) ? statement.trim() : "";
        if (cleanStatement.startsWith("# ")) {
            int firstLineEnd = cleanStatement.indexOf('\n');
            String firstLine = firstLineEnd != -1 ? cleanStatement.substring(2, firstLineEnd).trim() : cleanStatement.substring(2).trim();
            if (firstLine.equalsIgnoreCase(cleanTitle)) {
                cleanStatement = firstLineEnd != -1 ? cleanStatement.substring(firstLineEnd + 1).trim() : "";
            }
        }

        if (!cleanStatement.isEmpty()) {
            sb.append(cleanStatement).append("\n\n");
        } else {
            sb.append("Descripción del problema...\n\n## Entrada\n\n## Salida\n\n");
        }

        // 4. Plantillas
        if (templates != null && !templates.isEmpty()) {
            boolean hasTemplates = false;
            for (Map.Entry<String, String> entry : templates.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    if (!hasTemplates) {
                        sb.append("## Plantillas\n\n");
                        hasTemplates = true;
                    }
                    String lang = entry.getKey().toLowerCase().trim();
                    String code = entry.getValue();
                    if (!code.endsWith("\n")) code += "\n";
                    sb.append("```").append(lang).append("\n")
                            .append(code)
                            .append("```\n\n");
                }
            }
        }

        // 5. Tests
        if (testCases != null && !testCases.isEmpty()) {
            sb.append("## Tests\n\n");
            for (TestCaseDTO tc : testCases) {
                boolean isPublic = tc.isPublic();
                double weight = tc.weight() > 0 ? tc.weight() : 1.0;

                sb.append("### Test");
                if (!isPublic) {
                    sb.append(" private");
                }
                if (weight != 1.0) {
                    if (weight == (long) weight) {
                        sb.append(" ").append((long) weight);
                    } else {
                        sb.append(" ").append(weight);
                    }
                }
                sb.append("\n");

                String input = tc.input() != null ? tc.input() : "";
                if (!input.isEmpty() && !input.endsWith("\n")) input += "\n";
                sb.append("```input\n").append(input).append("```\n");

                String output = tc.effectiveExpected() != null ? tc.effectiveExpected() : "";
                if (!output.isEmpty() && !output.endsWith("\n")) output += "\n";
                sb.append("```output\n").append(output).append("```\n");

                if (tc.explanation() != null && !tc.explanation().isBlank()) {
                    sb.append("```explanation\n").append(tc.explanation().trim()).append("\n```\n");
                }

                sb.append("\n");
            }
        }

        return sb.toString().trim() + "\n";
    }
}
