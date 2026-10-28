package com.benigascode.content.service;

import com.benigascode.content.dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class ExerciseSolutionTestingService {

    private static final Logger log = LoggerFactory.getLogger(ExerciseSolutionTestingService.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${benigascode.runner.url:http://runner:5000}")
    private String runnerUrl;

    @Value("${benigascode.runner.token:dev_runner_token_secure_12345}")
    private String runnerToken;

    public ExerciseSolutionTestingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public ValidateSolutionsResponse validateSolutions(ValidateSolutionsRequest req) {
        Map<String, String> solutions = req.solutions() != null ? req.solutions() : Map.of();
        List<TestCaseDTO> testCases = req.testCases() != null ? req.testCases() : List.of();

        if (solutions.isEmpty()) {
            return new ValidateSolutionsResponse(false, true, Map.of(), List.of("No se han proporcionado soluciones para validar."));
        }

        Map<String, ValidateSolutionsResponse.SolutionEvaluationResult> results = new LinkedHashMap<>();
        boolean allPassedOverall = true;

        for (Map.Entry<String, String> entry : solutions.entrySet()) {
            String rawLang = entry.getKey();
            String code = entry.getValue();
            if (code == null || code.isBlank()) continue;

            String normLang = normalizeLang(rawLang);
            ValidateSolutionsResponse.SolutionEvaluationResult evalResult = evaluateSingleSolution(
                    code, normLang, testCases, req.compileConfig(), req.runConfig(), req.comparatorConfig()
            );
            results.put(normLang, evalResult);

            if (!"CORRECT".equalsIgnoreCase(evalResult.status()) || evalResult.passedCount() < evalResult.totalCount()) {
                allPassedOverall = false;
            }
        }

        // Cross-language output verification
        List<String> mismatches = new ArrayList<>();
        boolean crossLanguageMatch = true;

        List<String> evaluatedLangs = new ArrayList<>(results.keySet());
        if (evaluatedLangs.size() > 1) {
            String primaryLang = evaluatedLangs.get(0);
            ValidateSolutionsResponse.SolutionEvaluationResult primaryResult = results.get(primaryLang);

            for (int i = 1; i < evaluatedLangs.size(); i++) {
                String otherLang = evaluatedLangs.get(i);
                ValidateSolutionsResponse.SolutionEvaluationResult otherResult = results.get(otherLang);

                int testCount = Math.min(primaryResult.testResults().size(), otherResult.testResults().size());
                for (int t = 0; t < testCount; t++) {
                    ValidateSolutionsResponse.SolutionTestDetail pTest = primaryResult.testResults().get(t);
                    ValidateSolutionsResponse.SolutionTestDetail oTest = otherResult.testResults().get(t);

                    String pOut = normalizeOutput(pTest.actualOutput());
                    String oOut = normalizeOutput(oTest.actualOutput());

                    if (!Objects.equals(pOut, oOut)) {
                        crossLanguageMatch = false;
                        mismatches.add(String.format("Discrepancia en %s entre %s y %s: %s produjo '%s' mientras %s produjo '%s'",
                                pTest.testName(), primaryLang, otherLang, primaryLang, trimSnippet(pOut), otherLang, trimSnippet(oOut)));
                    }
                }
            }
        }

        return new ValidateSolutionsResponse(allPassedOverall, crossLanguageMatch, results, mismatches);
    }

    public GenerateTestOutputsResponse generateOutputs(GenerateTestOutputsRequest req) {
        String code = req.sourceCode();
        String lang = normalizeLang(req.language());
        List<TestCaseDTO> testCases = req.testCases() != null ? req.testCases() : List.of();

        if (code == null || code.isBlank()) {
            return new GenerateTestOutputsResponse(false, "El código de la solución no puede estar vacío.", List.of());
        }

        if (testCases.isEmpty()) {
            return new GenerateTestOutputsResponse(false, "No se han proporcionado casos de prueba con entrada.", List.of());
        }

        try {
            Map<String, Object> compileConfig = buildCompileConfig(lang, req.compileConfig());
            Map<String, Object> runConfig = buildRunConfig(lang, req.runConfig());

            List<Map<String, Object>> testsPayload = new ArrayList<>();
            for (int i = 0; i < testCases.size(); i++) {
                TestCaseDTO tc = testCases.get(i);
                Map<String, Object> t = new HashMap<>();
                t.put("id", tc.id() != null ? tc.id() : "test-" + (i + 1));
                t.put("name", tc.name() != null ? tc.name() : "Test #" + (i + 1));
                t.put("input", tc.input() != null ? tc.input() : "");
                t.put("expected", ""); // Dummy expected: we want actualOutput
                t.put("weight", 1.0);
                t.put("is_public", tc.isPublic());
                testsPayload.add(t);
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("sourceCode", code);
            payload.put("language", lang);
            payload.put("compileConfig", compileConfig);
            payload.put("runConfig", runConfig);
            payload.put("comparator", Map.of("type", "TRIM"));
            payload.put("tests", testsPayload);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(runnerUrl + "/evaluate"))
                    .header("Content-Type", "application/json")
                    .header("X-Runner-Token", runnerToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return new GenerateTestOutputsResponse(false, "Error comunicando con el runner (HTTP " + response.statusCode() + ")", List.of());
            }

            JsonNode resNode = objectMapper.readTree(response.body());
            JsonNode compileNode = resNode.path("compile");
            boolean compileSuccess = compileNode.path("success").asBoolean(true);
            if (!compileSuccess) {
                String compileStderr = compileNode.path("stderr").asText("");
                return new GenerateTestOutputsResponse(false, "Error de compilación en la solución: " + compileStderr, List.of());
            }

            List<GenerateTestOutputsResponse.GeneratedOutputItem> outputs = new ArrayList<>();
            JsonNode testsArr = resNode.has("testResults") ? resNode.path("testResults") : resNode.path("test_results");

            for (int i = 0; i < testCases.size(); i++) {
                TestCaseDTO tc = testCases.get(i);
                String testId = tc.id() != null ? tc.id() : "test-" + (i + 1);

                String actualOut = "";
                boolean success = true;
                String error = null;

                if (testsArr.isArray() && i < testsArr.size()) {
                    JsonNode tNode = testsArr.get(i);
                    actualOut = tNode.path("actualOutput").asText("");
                    if (actualOut.isEmpty() && tNode.has("stdout")) {
                        actualOut = tNode.path("stdout").asText("");
                    }
                    String status = tNode.path("status").asText("PASSED");
                    if ("TIMEOUT".equalsIgnoreCase(status) || "RUNTIME_ERROR".equalsIgnoreCase(status)) {
                        success = false;
                        error = status + ": " + tNode.path("stderr").asText("");
                    }
                }

                outputs.add(new GenerateTestOutputsResponse.GeneratedOutputItem(
                        i,
                        testId,
                        actualOut,
                        success,
                        error
                ));
            }

            return new GenerateTestOutputsResponse(true, null, outputs);

        } catch (Exception e) {
            log.error("Error al generar salidas de prueba con la solución: ", e);
            return new GenerateTestOutputsResponse(false, "Excepción durante la ejecución: " + e.getMessage(), List.of());
        }
    }

    private ValidateSolutionsResponse.SolutionEvaluationResult evaluateSingleSolution(
            String code,
            String lang,
            List<TestCaseDTO> testCases,
            Map<String, Object> rawCompileConfig,
            Map<String, Object> rawRunConfig,
            Map<String, Object> rawComparatorConfig
    ) {
        try {
            Map<String, Object> compileConfig = buildCompileConfig(lang, rawCompileConfig);
            Map<String, Object> runConfig = buildRunConfig(lang, rawRunConfig);
            Map<String, Object> comparatorConfig = rawComparatorConfig != null ? rawComparatorConfig : Map.of("type", "exact_line_by_line", "ignore_trailing_whitespace", true);

            List<Map<String, Object>> testsPayload = new ArrayList<>();
            for (int i = 0; i < testCases.size(); i++) {
                TestCaseDTO tc = testCases.get(i);
                Map<String, Object> t = new HashMap<>();
                t.put("id", tc.id() != null ? tc.id() : "test-" + (i + 1));
                t.put("name", tc.name() != null ? tc.name() : "Test #" + (i + 1));
                t.put("input", tc.input() != null ? tc.input() : "");
                t.put("expected", tc.effectiveExpected() != null ? tc.effectiveExpected() : "");
                t.put("weight", tc.weight() > 0 ? tc.weight() : 1.0);
                t.put("is_public", tc.isPublic());
                testsPayload.add(t);
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("sourceCode", code);
            payload.put("language", lang);
            payload.put("compileConfig", compileConfig);
            payload.put("runConfig", runConfig);
            payload.put("comparator", comparatorConfig);
            payload.put("tests", testsPayload);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(runnerUrl + "/evaluate"))
                    .header("Content-Type", "application/json")
                    .header("X-Runner-Token", runnerToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return new ValidateSolutionsResponse.SolutionEvaluationResult(
                        lang, "SYSTEM_ERROR", false, "Error comunicando con el runner (HTTP " + response.statusCode() + ")", 0, testCases.size(), List.of()
                );
            }

            JsonNode resNode = objectMapper.readTree(response.body());
            JsonNode compileNode = resNode.path("compile");
            boolean compileSuccess = compileNode.path("success").asBoolean(true);
            String compileError = compileNode.path("stderr").asText("");

            if (!compileSuccess) {
                return new ValidateSolutionsResponse.SolutionEvaluationResult(
                        lang, "COMPILE_ERROR", false, compileError, 0, testCases.size(), List.of()
                );
            }

            List<ValidateSolutionsResponse.SolutionTestDetail> details = new ArrayList<>();
            JsonNode testsArr = resNode.has("testResults") ? resNode.path("testResults") : resNode.path("test_results");

            int passedCount = 0;
            if (testsArr.isArray()) {
                for (int i = 0; i < testCases.size() && i < testsArr.size(); i++) {
                    TestCaseDTO tc = testCases.get(i);
                    JsonNode tNode = testsArr.get(i);

                    boolean passed = tNode.path("passed").asBoolean(false);
                    if (passed) passedCount++;

                    String status = tNode.path("status").asText(passed ? "PASSED" : "FAILED");
                    long durationMs = tNode.path("durationMs").asLong(0);
                    String actualOut = tNode.path("actualOutput").asText("");
                    if (actualOut.isEmpty() && tNode.has("stdout")) {
                        actualOut = tNode.path("stdout").asText("");
                    }
                    String err = tNode.path("stderr").asText("");

                    details.add(new ValidateSolutionsResponse.SolutionTestDetail(
                            tc.id() != null ? tc.id() : "test-" + (i + 1),
                            tc.name() != null ? tc.name() : "Test #" + (i + 1),
                            tc.isPublic(),
                            passed,
                            status,
                            durationMs,
                            tc.input(),
                            tc.effectiveExpected(),
                            actualOut,
                            err.isBlank() ? null : err
                    ));
                }
            }

            String overallStatus = passedCount == testCases.size() ? "CORRECT" : "WRONG_ANSWER";

            return new ValidateSolutionsResponse.SolutionEvaluationResult(
                    lang, overallStatus, true, null, passedCount, testCases.size(), details
            );

        } catch (Exception e) {
            log.error("Error al validar solución para lenguaje {}: ", lang, e);
            return new ValidateSolutionsResponse.SolutionEvaluationResult(
                    lang, "SYSTEM_ERROR", false, e.getMessage(), 0, testCases.size(), List.of()
            );
        }
    }

    private Map<String, Object> buildCompileConfig(String lang, Map<String, Object> original) {
        Map<String, Object> cfg = new HashMap<>(original != null ? original : Map.of());
        if ("python".equalsIgnoreCase(lang)) {
            String cmd = (String) cfg.get("command");
            if (cmd == null || cmd.contains("javac")) {
                cfg.put("command", "python3 -m py_compile solution.py");
            }
        } else {
            String cmd = (String) cfg.get("command");
            if (cmd == null || cmd.contains("python")) {
                cfg.put("command", "javac Main.java");
            }
        }
        if (!cfg.containsKey("timeout_seconds")) {
            cfg.put("timeout_seconds", 15);
        }
        return cfg;
    }

    private Map<String, Object> buildRunConfig(String lang, Map<String, Object> original) {
        Map<String, Object> cfg = new HashMap<>(original != null ? original : Map.of());
        if ("python".equalsIgnoreCase(lang)) {
            String cmd = (String) cfg.get("command");
            if (cmd == null || cmd.contains("java ")) {
                cfg.put("command", "python3 solution.py");
            }
        } else {
            String cmd = (String) cfg.get("command");
            if (cmd == null || cmd.contains("python")) {
                cfg.put("command", "java Main");
            }
        }
        if (!cfg.containsKey("timeout_seconds")) {
            cfg.put("timeout_seconds", 3);
        }
        if (!cfg.containsKey("memory_limit_mb")) {
            cfg.put("memory_limit_mb", 256);
        }
        return cfg;
    }

    private String normalizeLang(String lang) {
        if (lang == null) return "java";
        String l = lang.trim().toLowerCase();
        if (l.startsWith("python") || l.equals("py")) return "python";
        if (l.startsWith("java")) return "java";
        return l;
    }

    private String normalizeOutput(String out) {
        if (out == null) return "";
        return out.replace("\r\n", "\n").stripTrailing();
    }

    private String trimSnippet(String s) {
        if (s == null) return "";
        if (s.length() <= 40) return s;
        return s.substring(0, 37) + "...";
    }
}
