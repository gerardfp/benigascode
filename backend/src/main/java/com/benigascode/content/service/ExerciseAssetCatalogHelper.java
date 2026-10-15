package com.benigascode.content.service;

import com.benigascode.content.domain.ExerciseAsset;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utilidad para el procesamiento, normalización, indexación consecutiva
 * y purga de assets e imágenes en la exportación e importación del catálogo.
 */
public class ExerciseAssetCatalogHelper {

    private static final Pattern MD_IMAGE_PATTERN = Pattern.compile(
            "!\\[(?<alt>[^\\]]*)\\]\\(\\s*(?<url>[^)\\s]+)(?:\\s+[\"'](?<title>[^\"']*)[\"'])?\\s*\\)"
    );

    private static final Pattern HTML_IMAGE_PATTERN = Pattern.compile(
            "<img\\s+([^>]*?)src=[\"'](?<url>[^\"']+)[\"']([^>]*?)>",
            Pattern.CASE_INSENSITIVE
    );

    public record ExportedAssetItem(
            ExerciseAsset asset,
            String newFilename,
            String relativePath
    ) {}

    public record PreparedExportAssets(
            String updatedStatement,
            String updatedTestsConfig,
            List<ExportedAssetItem> referencedAssets,
            List<ExerciseAsset> unreferencedAssets
    ) {
        public PreparedExportAssets(String updatedStatement, List<ExportedAssetItem> referencedAssets, List<ExerciseAsset> unreferencedAssets) {
            this(updatedStatement, "{}", referencedAssets, unreferencedAssets);
        }
    }

    /**
     * Prepara los assets de un ejercicio para su exportación al catálogo:
     * 1. Detecta todas las referencias a imágenes en el enunciado (Markdown y HTML <img>).
     * 2. Descarta y separa los assets que no estén referenciados para su eliminación.
     * 3. Ordena los assets referenciados estrictamente por su orden de primera aparición en el enunciado.
     * 4. Asigna nombres correlativos: <slug>-img0.<ext>, <slug>-img1.<ext>, etc.
     * 5. Reescribe el enunciado para que apunte a assets/<slug>-img<N>.<ext>.
     */
    public static PreparedExportAssets prepareAssetsForExport(String slug, String statement, List<ExerciseAsset> allAssets) {
        return prepareAssetsForExport(slug, statement, "{}", allAssets, new ObjectMapper());
    }

    /**
     * Prepara los assets de un ejercicio para su exportación al catálogo:
     * 1. Detecta todas las referencias a imágenes en el enunciado y explicaciones de tests (Markdown y HTML <img>).
     * 2. Descarta y separa los assets que no estén referenciados para su eliminación.
     * 3. Ordena los assets referenciados correlativamente según su primera aparición (enunciado primero, luego tests).
     * 4. Asigna nombres correlativos: <slug>-img0.<ext>, <slug>-img1.<ext>, etc.
     * 5. Reescribe el enunciado y las explicaciones de los tests para apuntar a assets/<slug>-img<N>.<ext>.
     */
    public static PreparedExportAssets prepareAssetsForExport(
            String slug,
            String statement,
            String testsConfigJson,
            List<ExerciseAsset> allAssets,
            ObjectMapper objectMapper) {
        if (allAssets == null || allAssets.isEmpty()) {
            return new PreparedExportAssets(
                    statement != null ? statement : "",
                    testsConfigJson != null ? testsConfigJson : "{}",
                    List.of(),
                    List.of()
            );
        }

        if (objectMapper == null) {
            objectMapper = new ObjectMapper();
        }

        String rawStatement = (statement != null) ? statement : "";
        List<ImageReferenceOccurrence> occurrences = findImageReferences(rawStatement);

        List<ExerciseAsset> orderedReferenced = new ArrayList<>();
        Set<UUID> addedAssetIds = new HashSet<>();
        Set<ExerciseAsset> addedAssets = new HashSet<>();
        Map<String, ExerciseAsset> urlToMatchedAsset = new HashMap<>();

        for (ImageReferenceOccurrence occ : occurrences) {
            ExerciseAsset matched = findMatchingAsset(occ.url, allAssets);
            if (matched != null) {
                urlToMatchedAsset.put(occ.url, matched);
                boolean alreadyAdded = (matched.getId() != null)
                        ? !addedAssetIds.add(matched.getId())
                        : !addedAssets.add(matched);
                if (!alreadyAdded) {
                    orderedReferenced.add(matched);
                }
            }
        }

        // Buscar referencias en las explicaciones de los casos de prueba
        List<String> explanationTexts = extractExplanationTexts(testsConfigJson, objectMapper);
        for (String exp : explanationTexts) {
            List<ImageReferenceOccurrence> expOccs = findImageReferences(exp);
            for (ImageReferenceOccurrence occ : expOccs) {
                ExerciseAsset matched = findMatchingAsset(occ.url, allAssets);
                if (matched != null) {
                    urlToMatchedAsset.put(occ.url, matched);
                    boolean alreadyAdded = (matched.getId() != null)
                            ? !addedAssetIds.add(matched.getId())
                            : !addedAssets.add(matched);
                    if (!alreadyAdded) {
                        orderedReferenced.add(matched);
                    }
                }
            }
        }

        // Separar no referenciados
        List<ExerciseAsset> unreferenced = new ArrayList<>();
        for (ExerciseAsset a : allAssets) {
            boolean isReferenced = (a.getId() != null)
                    ? addedAssetIds.contains(a.getId())
                    : addedAssets.contains(a);
            if (!isReferenced) {
                unreferenced.add(a);
            }
        }

        // Asignar nombres correlativos
        Map<ExerciseAsset, ExportedAssetItem> assetToItem = new HashMap<>();
        List<ExportedAssetItem> exportedItems = new ArrayList<>();
        int index = 0;
        for (ExerciseAsset a : orderedReferenced) {
            String ext = resolveExtension(a.getFilename(), a.getContentType());
            String newFilename = slug + "-img" + index + ext;
            String relPath = "assets/" + newFilename;
            ExportedAssetItem item = new ExportedAssetItem(a, newFilename, relPath);
            exportedItems.add(item);
            assetToItem.put(a, item);
            index++;
        }

        // Reescribir referencias en el statement y en testsConfig
        String rewrittenStatement = rewriteText(rawStatement, urlToMatchedAsset, assetToItem);
        String rewrittenTestsConfig = rewriteTestsConfig(testsConfigJson, urlToMatchedAsset, assetToItem, objectMapper);

        return new PreparedExportAssets(rewrittenStatement, rewrittenTestsConfig, exportedItems, unreferenced);
    }

    /**
     * Comprueba si una URL de imagen coincide con un archivo de asset.
     */
    public static boolean matchesAssetFilename(String refUrl, String assetFilename) {
        if (refUrl == null || assetFilename == null) return false;
        String cleanUrl = normalizeImageUrl(refUrl);
        String cleanAsset = normalizeFilename(assetFilename);

        if (cleanUrl.equalsIgnoreCase(cleanAsset)) {
            return true;
        }

        String baseRef = new File(cleanUrl).getName();
        String baseAsset = new File(cleanAsset).getName();
        return baseRef.equalsIgnoreCase(baseAsset);
    }

    /**
     * Extrae las referencias a imágenes (URL) presentes en un enunciado Markdown.
     */
    public static List<String> extractReferencedImageUrls(String statement) {
        if (statement == null || statement.isBlank()) return List.of();
        List<ImageReferenceOccurrence> occs = findImageReferences(statement);
        List<String> list = new ArrayList<>();
        for (ImageReferenceOccurrence o : occs) {
            list.add(o.url);
        }
        return list;
    }

    // ==================== MÉTODOS INTERNOS ====================

    private record ImageReferenceOccurrence(int start, int end, String url, boolean isHtml) {}

    private static List<ImageReferenceOccurrence> findImageReferences(String text) {
        List<ImageReferenceOccurrence> list = new ArrayList<>();

        // 1. Markdown ![alt](url)
        Matcher mdMatcher = MD_IMAGE_PATTERN.matcher(text);
        while (mdMatcher.find()) {
            String url = mdMatcher.group("url");
            if (isLocalAssetUrl(url)) {
                list.add(new ImageReferenceOccurrence(mdMatcher.start(), mdMatcher.end(), url, false));
            }
        }

        // 2. HTML <img src="url">
        Matcher htmlMatcher = HTML_IMAGE_PATTERN.matcher(text);
        while (htmlMatcher.find()) {
            String url = htmlMatcher.group("url");
            if (isLocalAssetUrl(url)) {
                list.add(new ImageReferenceOccurrence(htmlMatcher.start(), htmlMatcher.end(), url, true));
            }
        }

        list.sort(Comparator.comparingInt(ImageReferenceOccurrence::start));
        return list;
    }

    private static boolean isLocalAssetUrl(String url) {
        if (url == null || url.isBlank()) return false;
        String trimmed = url.trim().toLowerCase();
        return !trimmed.startsWith("http://") &&
               !trimmed.startsWith("https://") &&
               !trimmed.startsWith("data:") &&
               !trimmed.startsWith("mailto:");
    }

    private static ExerciseAsset findMatchingAsset(String refUrl, List<ExerciseAsset> allAssets) {
        for (ExerciseAsset a : allAssets) {
            if (matchesAssetFilename(refUrl, a.getFilename())) {
                return a;
            }
        }
        return null;
    }

    public static String rewriteText(
            String text,
            Map<String, ExerciseAsset> urlToMatchedAsset,
            Map<ExerciseAsset, ExportedAssetItem> assetToItem) {

        if (text == null || text.isBlank() || urlToMatchedAsset.isEmpty() || assetToItem.isEmpty()) {
            return text != null ? text : "";
        }

        // 1. Reemplazar en Markdown images: ![alt](url)
        Matcher mdMatcher = MD_IMAGE_PATTERN.matcher(text);
        StringBuilder sbMd = new StringBuilder();
        while (mdMatcher.find()) {
            String rawUrl = mdMatcher.group("url");
            ExerciseAsset matched = urlToMatchedAsset.get(rawUrl);
            if (matched == null) {
                // Fallback de búsqueda si la key exacta no coincide
                matched = findMatchingAsset(rawUrl, new ArrayList<>(assetToItem.keySet()));
            }

            if (matched != null && assetToItem.containsKey(matched)) {
                ExportedAssetItem item = assetToItem.get(matched);
                String alt = mdMatcher.group("alt");
                String title = mdMatcher.group("title");
                String replacement = (title != null && !title.isBlank())
                        ? "![" + alt + "](" + item.relativePath() + " \"" + title + "\")"
                        : "![" + alt + "](" + item.relativePath() + ")";
                mdMatcher.appendReplacement(sbMd, Matcher.quoteReplacement(replacement));
            } else {
                mdMatcher.appendReplacement(sbMd, Matcher.quoteReplacement(mdMatcher.group(0)));
            }
        }
        mdMatcher.appendTail(sbMd);
        String afterMd = sbMd.toString();

        // 2. Reemplazar en HTML <img>
        Matcher htmlMatcher = HTML_IMAGE_PATTERN.matcher(afterMd);
        StringBuilder sbHtml = new StringBuilder();
        while (htmlMatcher.find()) {
            String rawUrl = htmlMatcher.group("url");
            ExerciseAsset matched = urlToMatchedAsset.get(rawUrl);
            if (matched == null) {
                matched = findMatchingAsset(rawUrl, new ArrayList<>(assetToItem.keySet()));
            }

            if (matched != null && assetToItem.containsKey(matched)) {
                ExportedAssetItem item = assetToItem.get(matched);
                String before = htmlMatcher.group(1);
                String after = htmlMatcher.group(3);
                String replacement = "<img " + before + "src=\"" + item.relativePath() + "\"" + after + ">";
                htmlMatcher.appendReplacement(sbHtml, Matcher.quoteReplacement(replacement));
            } else {
                htmlMatcher.appendReplacement(sbHtml, Matcher.quoteReplacement(htmlMatcher.group(0)));
            }
        }
        htmlMatcher.appendTail(sbHtml);

        return sbHtml.toString();
    }

    private static String rewriteStatement(
            String statement,
            Map<String, ExerciseAsset> urlToMatchedAsset,
            Map<ExerciseAsset, ExportedAssetItem> assetToItem) {
        return rewriteText(statement, urlToMatchedAsset, assetToItem);
    }

    public static String rewriteTestsConfig(
            String testsConfigJson,
            Map<String, ExerciseAsset> urlToMatchedAsset,
            Map<ExerciseAsset, ExportedAssetItem> assetToItem,
            ObjectMapper mapper) {

        if (testsConfigJson == null || testsConfigJson.isBlank()) {
            return testsConfigJson != null ? testsConfigJson : "{}";
        }
        if (urlToMatchedAsset.isEmpty() || assetToItem.isEmpty()) {
            return testsConfigJson;
        }

        try {
            JsonNode root = mapper.readTree(testsConfigJson);
            boolean changed = false;

            if (root.isObject()) {
                ObjectNode objRoot = (ObjectNode) root;
                Iterator<Map.Entry<String, JsonNode>> fields = objRoot.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    if (entry.getValue().isArray()) {
                        ArrayNode arr = (ArrayNode) entry.getValue();
                        for (int i = 0; i < arr.size(); i++) {
                            JsonNode item = arr.get(i);
                            if (item.isObject() && item.has("explanation") && !item.get("explanation").isNull()) {
                                String origExp = item.get("explanation").asText();
                                String rewrittenExp = rewriteText(origExp, urlToMatchedAsset, assetToItem);
                                if (!origExp.equals(rewrittenExp)) {
                                    ((ObjectNode) item).put("explanation", rewrittenExp);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            } else if (root.isArray()) {
                ArrayNode arr = (ArrayNode) root;
                for (int i = 0; i < arr.size(); i++) {
                    JsonNode item = arr.get(i);
                    if (item.isObject() && item.has("explanation") && !item.get("explanation").isNull()) {
                        String origExp = item.get("explanation").asText();
                        String rewrittenExp = rewriteText(origExp, urlToMatchedAsset, assetToItem);
                        if (!origExp.equals(rewrittenExp)) {
                            ((ObjectNode) item).put("explanation", rewrittenExp);
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                return mapper.writeValueAsString(root);
            }
            return testsConfigJson;
        } catch (Exception e) {
            return testsConfigJson;
        }
    }

    private static List<String> extractExplanationTexts(String testsConfigJson, ObjectMapper mapper) {
        if (testsConfigJson == null || testsConfigJson.isBlank()) {
            return List.of();
        }
        List<String> list = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(testsConfigJson);
            if (root.isObject()) {
                List<String> priorityKeys = List.of("public", "private");
                for (String key : priorityKeys) {
                    if (root.has(key) && root.get(key).isArray()) {
                        for (JsonNode t : root.get(key)) {
                            if (t.has("explanation") && !t.get("explanation").isNull()) {
                                String exp = t.get("explanation").asText();
                                if (exp != null && !exp.isBlank()) {
                                    list.add(exp);
                                }
                            }
                        }
                    }
                }
                Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    if (!priorityKeys.contains(entry.getKey()) && entry.getValue().isArray()) {
                        for (JsonNode t : entry.getValue()) {
                            if (t.has("explanation") && !t.get("explanation").isNull()) {
                                String exp = t.get("explanation").asText();
                                if (exp != null && !exp.isBlank()) {
                                    list.add(exp);
                                }
                            }
                        }
                    }
                }
            } else if (root.isArray()) {
                for (JsonNode t : root) {
                    if (t.has("explanation") && !t.get("explanation").isNull()) {
                        String exp = t.get("explanation").asText();
                        if (exp != null && !exp.isBlank()) {
                            list.add(exp);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return list;
    }

    private static String normalizeImageUrl(String url) {
        String decoded;
        try {
            decoded = URLDecoder.decode(url, StandardCharsets.UTF_8);
        } catch (Exception e) {
            decoded = url;
        }

        // Quitar query y fragmento
        int qIdx = decoded.indexOf('?');
        if (qIdx != -1) decoded = decoded.substring(0, qIdx);
        int hIdx = decoded.indexOf('#');
        if (hIdx != -1) decoded = decoded.substring(0, hIdx);

        decoded = decoded.replace('\\', '/').trim();
        while (decoded.startsWith("/")) {
            decoded = decoded.substring(1);
        }
        if (decoded.startsWith("./")) {
            decoded = decoded.substring(2);
        }

        // Si viene como /api/v1/exercises/{id}/assets/{filename}
        int apiAssetsIdx = decoded.indexOf("/assets/");
        if (apiAssetsIdx != -1) {
            decoded = decoded.substring(apiAssetsIdx + 8);
        } else if (decoded.startsWith("api/v1/exercises/") && decoded.contains("/assets/")) {
            decoded = decoded.substring(decoded.indexOf("/assets/") + 8);
        }

        // Si viene como assets/{filename}
        if (decoded.startsWith("assets/")) {
            decoded = decoded.substring(7);
        }

        return decoded;
    }

    private static String normalizeFilename(String fn) {
        if (fn == null) return "";
        String s = fn.replace('\\', '/').trim();
        while (s.startsWith("/")) {
            s = s.substring(1);
        }
        if (s.startsWith("assets/")) {
            s = s.substring(7);
        }
        return s;
    }

    public static String resolveExtension(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
            if (ext.equals(".jpeg")) ext = ".jpg";
            return ext;
        }

        if (contentType != null) {
            String lower = contentType.toLowerCase();
            if (lower.contains("jpeg") || lower.contains("jpg")) return ".jpg";
            if (lower.contains("png")) return ".png";
            if (lower.contains("gif")) return ".gif";
            if (lower.contains("svg")) return ".svg";
            if (lower.contains("webp")) return ".webp";
        }

        return ".png";
    }
}
