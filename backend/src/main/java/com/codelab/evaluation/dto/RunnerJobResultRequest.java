package com.codelab.evaluation.dto;

import java.math.BigDecimal;
import java.util.List;

public record RunnerJobResultRequest(
    String status, // CORRECT, INCORRECT, COMPILE_ERROR, TIMEOUT, RUNTIME_ERROR, SYSTEM_ERROR
    BigDecimal score,
    CompileDetails compile,
    List<RunnerTestResult> testResults
) {
    public record CompileDetails(
        boolean success,
        String stdout,
        String stderr
    ) {}

    public record RunnerTestResult(
        String testId,
        boolean isPublic,
        String status,
        int durationMs,
        String stdout,
        String stderr,
        String expectedOutput,
        String actualOutput,
        BigDecimal score
    ) {}
}

