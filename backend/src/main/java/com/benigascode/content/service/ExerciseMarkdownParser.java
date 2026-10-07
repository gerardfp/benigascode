package com.benigascode.content.service;

import com.benigascode.content.dto.TestCaseDTO;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExerciseMarkdownParser {

    public record ParsedExercise(
            String title,
            String slug,
            List<String> tags,
            String statement,
            Map<String, String> templates,
            List<TestCaseDTO> testCases
    ) {}

    public record ParseResult(
            boolean success,
            ParsedExercise exercise,
            List<String> errors,
            List<String> warnings
    ) {}

    private static final Pattern FRONTMATTER_PATTERN = Pattern.compile("^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n?", Pattern.MULTILINE);
    private static final Pattern SLUG_PATTERN = Pattern.compile("^slug:\\s*['\"]?([^'\"\\r\\n]+)['\"]?", Pattern.MULTILINE);
    private static final Pattern INLINE_TAGS_PATTERN = Pattern.compile("^tags:\\s*\\[(.*?)\\]", Pattern.MULTILINE);
    private static final Pattern LIST_TAGS_PATTERN = Pattern.compile("^tags:\\s*\\r?\\n((?:\\s*-\\s*[^\\r\\n]+\\r?\\n?)+)", Pattern.MULTILINE);
    private static final Pattern TITLE_PATTERN = Pattern.compile("^#\\s+([^\\r\\n]+)", Pattern.MULTILINE);
    private static final Pattern H2_PATTERN = Pattern.compile("^##\\s+([^\\r\\n]+)", Pattern.MULTILINE);
    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```([a-zA-Z0-9_\\-#+]+)?\\r?\\n([\\s\\S]*?)```");
    private static final Pattern TEST_HEADER_PATTERN = Pattern.compile("^###\\s+Test(?:\\s+([^\\r\\n]*))?", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
    private static final Pattern WEIGHT_PATTERN = Pattern.compile("(?:peso[:=]\\s*|\\b)([0-9]+(?:\\.[0-9]+)?)\\b", Pattern.CASE_INSENSITIVE);

    public static String slugify(String text) {
        if (text == null || text.isBlank()) return "";
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("[\\p{InCombiningDiacriticalMarks}]", "");
        return normalized.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    public static ParseResult parse(String rawMarkdown, String fallbackSlug) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        String text = (rawMarkdown != null ? rawMarkdown : "").replace("\r\n", "\n");

        String slug = "";
        List<String> tags = new ArrayList<>();

        // 1. Extraer Frontmatter YAML
        Matcher fmMatcher = FRONTMATTER_PATTERN.matcher(text);
        if (fmMatcher.find()) {
            String yamlContent = fmMatcher.group(1);
            text = text.substring(fmMatcher.end());

            Matcher slugMatch = SLUG_PATTERN.matcher(yamlContent);
            if (slugMatch.find()) {
                slug = slugMatch.group(1).trim();
            }

            Matcher inlineTags = INLINE_TAGS_PATTERN.matcher(yamlContent);
            if (inlineTags.find()) {
                String[] parts = inlineTags.group(1).split(",");
                for (String p : parts) {
                    String clean = p.replace("'", "").replace("\"", "").trim();
                    if (!clean.isEmpty()) tags.add(clean);
                }
            } else {
                Matcher listTags = LIST_TAGS_PATTERN.matcher(yamlContent);
                if (listTags.find()) {
                    String[] lines = listTags.group(1).split("\n");
                    for (String line : lines) {
                        String clean = line.replaceFirst("^\\s*-\\s*", "").replace("'", "").replace("\"", "").trim();
                        if (!clean.isEmpty()) tags.add(clean);
                    }
                }
            }
        }

        // 2. Extraer Título (# Título)
        String title;
        Matcher titleMatcher = TITLE_PATTERN.matcher(text);
        int titleEndIndex = 0;
        if (titleMatcher.find()) {
            title = titleMatcher.group(1).trim();
            titleEndIndex = titleMatcher.end();
        } else {
            warnings.add("No se ha encontrado un título con \"# Título\".");
            title = (fallbackSlug != null && !fallbackSlug.isBlank()) ? fallbackSlug : "Ejercicio sin título";
        }

        if (slug.isBlank()) {
            if (fallbackSlug != null && !fallbackSlug.isBlank()) {
                slug = fallbackSlug.trim().toLowerCase();
            } else {
                slug = slugify(title);
            }
        }

        // 3. Identificar secciones H2 (##)
        int templatesStartIndex = -1;
        int testsStartIndex = -1;

        Matcher h2Matcher = H2_PATTERN.matcher(text);
        while (h2Matcher.find()) {
            String heading = h2Matcher.group(1).trim().toLowerCase();
            if (isTemplatesHeading(heading) && templatesStartIndex == -1) {
                templatesStartIndex = h2Matcher.start();
            } else if (isTestsHeading(heading) && testsStartIndex == -1) {
                testsStartIndex = h2Matcher.start();
            }
        }

        int statementEndIndex = text.length();
        if (templatesStartIndex != -1) {
            statementEndIndex = templatesStartIndex;
        } else if (testsStartIndex != -1) {
            statementEndIndex = testsStartIndex;
        }

        String rawStatement = "";
        if (titleEndIndex <= statementEndIndex) {
            rawStatement = text.substring(titleEndIndex, statementEndIndex).trim();
        }

        // 4. Extraer Plantillas
        Map<String, String> templates = new LinkedHashMap<>();
        if (templatesStartIndex != -1) {
            int templatesEndIndex = testsStartIndex != -1 ? testsStartIndex : text.length();
            String templatesBlock = text.substring(templatesStartIndex, templatesEndIndex);

            Matcher codeMatcher = CODE_BLOCK_PATTERN.matcher(templatesBlock);
            while (codeMatcher.find()) {
                String rawLang = codeMatcher.group(1) != null ? codeMatcher.group(1).trim().toLowerCase() : "java";
                String normLang = normalizeLang(rawLang);
                String codeContent = codeMatcher.group(2);
                templates.put(normLang, codeContent);
            }
        }

        // 5. Extraer Tests
        List<TestCaseDTO> testCases = new ArrayList<>();
        if (testsStartIndex != -1) {
            String testsBlock = text.substring(testsStartIndex);

            record TestHeader(int index, String params) {}
            List<TestHeader> testHeaders = new ArrayList<>();

            Matcher thMatcher = TEST_HEADER_PATTERN.matcher(testsBlock);
            while (thMatcher.find()) {
                testHeaders.add(new TestHeader(thMatcher.start(), thMatcher.group(1) != null ? thMatcher.group(1) : ""));
            }

            for (int i = 0; i < testHeaders.size(); i++) {
                TestHeader cur = testHeaders.get(i);
                int startPos = cur.index;
                int endPos = (i < testHeaders.size() - 1) ? testHeaders.get(i + 1).index : testsBlock.length();
                String chunk = testsBlock.substring(startPos, endPos);

                String params = cur.params.trim().toLowerCase();
                boolean isPublic = true;
                if (Pattern.compile("\\b(private|privado|oculto|hidden)\\b", Pattern.CASE_INSENSITIVE).matcher(params).find()) {
                    isPublic = false;
                } else if (Pattern.compile("\\b(public|público|publico|visible)\\b", Pattern.CASE_INSENSITIVE).matcher(params).find()) {
                    isPublic = true;
                }

                double weight = 1.0;
                Matcher wMatcher = WEIGHT_PATTERN.matcher(params);
                if (wMatcher.find()) {
                    try {
                        double parsedW = Double.parseDouble(wMatcher.group(1));
                        if (parsedW > 0) weight = parsedW;
                    } catch (NumberFormatException ignored) {}
                }

                String testInput = null;
                String testOutput = null;
                String testExplanation = null;

                record FallbackBlock(String tag, String content) {}
                List<FallbackBlock> fallbackBlocks = new ArrayList<>();

                Matcher blockMatcher = CODE_BLOCK_PATTERN.matcher(chunk);
                while (blockMatcher.find()) {
                    String tag = blockMatcher.group(1) != null ? blockMatcher.group(1).trim().toLowerCase() : "";
                    String content = blockMatcher.group(2);

                    if (tag.matches("^(input|in|entrada|stdin)$")) {
                        testInput = content;
                    } else if (tag.matches("^(output|out|salida|stdout|expected)$")) {
                        testOutput = content;
                    } else if (tag.matches("^(explanation|explicacion|explicación)$")) {
                        testExplanation = content.trim();
                    } else {
                        fallbackBlocks.add(new FallbackBlock(tag, content));
                    }
                }

                if (testInput == null && !fallbackBlocks.isEmpty()) {
                    testInput = fallbackBlocks.remove(0).content;
                }
                if (testOutput == null && !fallbackBlocks.isEmpty()) {
                    testOutput = fallbackBlocks.remove(0).content;
                }
                if (testExplanation == null && !fallbackBlocks.isEmpty()) {
                    testExplanation = fallbackBlocks.remove(0).content.trim();
                }

                String pubLabel = isPublic ? "pub-" + (i + 1) : "priv-" + (i + 1);
                String nameLabel = (isPublic ? "Test Público #" : "Test Privado #") + (i + 1);

                testCases.add(new TestCaseDTO(
                        pubLabel,
                        nameLabel,
                        isPublic,
                        i,
                        weight,
                        testInput != null ? testInput : "",
                        testOutput != null ? testOutput : "",
                        testExplanation != null ? testExplanation : ""
                ));
            }
        }

        if (testCases.isEmpty()) {
            warnings.add("No se han detectado casos de prueba en la sección ## Tests.");
        }

        ParsedExercise exercise = new ParsedExercise(
                title,
                slug,
                tags,
                rawStatement,
                templates,
                testCases
        );

        return new ParseResult(errors.isEmpty(), exercise, errors, warnings);
    }

    private static boolean isTemplatesHeading(String clean) {
        return clean.matches("^(plantillas?|starter\\s*code|código\\s*inicial)$");
    }

    private static boolean isTestsHeading(String clean) {
        return clean.matches("^(tests?|casos\\s*(de\\s*)?pruebas?|pruebas?|test\\s*cases?)$");
    }

    private static String normalizeLang(String lang) {
        if (lang == null) return "java";
        String l = lang.trim().toLowerCase();
        if (l.startsWith("python") || l.equals("py")) return "python";
        if (l.startsWith("java")) return "java";
        return l;
    }
}
