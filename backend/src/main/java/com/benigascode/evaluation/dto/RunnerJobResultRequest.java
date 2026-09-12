package com.benigascode.evaluation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public record RunnerJobResultRequest(
    String status, // CORRECT, INCORRECT, COMPILE_ERROR, TIMEOUT, RUNTIME_ERROR, SYSTEM_ERROR
    BigDecimal score,
    CompileDetails compile,
    @JsonAlias("test_results") @JsonProperty("testResults") List<RunnerTestResult> testResults
) {
    public record CompileDetails(
        boolean success,
        String stdout,
        String stderr
    ) {}

    public record RunnerTestResult(
        @JsonAlias("test_id") @JsonProperty("testId") String testId,
        @JsonAlias("is_public") @JsonProperty("isPublic") boolean isPublic,
        String status,
        @JsonAlias("duration_ms") @JsonProperty("durationMs") int durationMs,
        String stdout,
        String stderr,
        @JsonAlias("expected_output") @JsonProperty("expectedOutput") String expectedOutput,
        @JsonAlias("actual_output") @JsonProperty("actualOutput") String actualOutput,
        BigDecimal score
    ) {}
}
