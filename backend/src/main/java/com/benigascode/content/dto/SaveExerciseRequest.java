package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public record SaveExerciseRequest(
    @NotBlank(message = "El slug no puede estar vacío")
    String slug,
    @NotBlank(message = "El título no puede estar vacío")
    String title,
    @NotBlank(message = "El enunciado no puede estar vacío")
    String statement,
    String language,
    String runtimeId,
    String starterCode,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> scoringConfig,
    Map<String, Object> comparatorConfig,
    Map<String, String> templates,
    List<String> tags,
    List<TestCaseDTO> tests,
    List<TestCaseDTO> testCases
) {
    public List<TestCaseDTO> effectiveTests() {
        if (testCases != null && !testCases.isEmpty()) return testCases;
        if (tests != null) return tests;
        return List.of();
    }
}
