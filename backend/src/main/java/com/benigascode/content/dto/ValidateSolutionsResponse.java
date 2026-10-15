package com.benigascode.content.dto;

import java.util.List;
import java.util.Map;

public record ValidateSolutionsResponse(
    boolean allPassed,
    boolean crossLanguageMatch,
    Map<String, SolutionEvaluationResult> results,
    List<String> mismatches
) {
    public record SolutionEvaluationResult(
        String language,
        String status,
        boolean compileSuccess,
        String compileError,
        int passedCount,
        int totalCount,
        List<SolutionTestDetail> testResults
    ) {}

    public record SolutionTestDetail(
        String testId,
        String testName,
        boolean isPublic,
        boolean passed,
        String status,
        Long durationMs,
        String input,
        String expectedOutput,
        String actualOutput,
        String error
    ) {}
}
