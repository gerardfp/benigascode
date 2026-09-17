package com.benigascode.evaluation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public record RunnerJobResultRequest(
    String status, // CORRECT, INCORRECT, COMPILE_ERROR, TIMEOUT, RUNTIME_ERROR, SYSTEM_ERROR
    BigDecimal score,
    CompileDetails compile,
    List<RunnerTestResult> testResults
) {
    @JsonCreator
    public RunnerJobResultRequest(
        @JsonProperty("status") String status,
        @JsonProperty("score") BigDecimal score,
        @JsonProperty("compile") CompileDetails compile,
        @JsonProperty("testResults") @JsonAlias("test_results") List<RunnerTestResult> testResults
    ) {
        this.status = status;
        this.score = score;
        this.compile = compile;
        this.testResults = testResults != null ? testResults : List.of();
    }

    public record CompileDetails(
        @JsonProperty("success") boolean success,
        @JsonProperty("stdout") String stdout,
        @JsonProperty("stderr") String stderr
    ) {
        @JsonCreator
        public CompileDetails(
            @JsonProperty("success") boolean success,
            @JsonProperty("stdout") String stdout,
            @JsonProperty("stderr") String stderr
        ) {
            this.success = success;
            this.stdout = stdout;
            this.stderr = stderr;
        }
    }

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
    ) {
        @JsonCreator
        public RunnerTestResult(
            @JsonProperty("testId") @JsonAlias("test_id") String testId,
            @JsonProperty("isPublic") @JsonAlias("is_public") boolean isPublic,
            @JsonProperty("status") String status,
            @JsonProperty("durationMs") @JsonAlias("duration_ms") int durationMs,
            @JsonProperty("stdout") String stdout,
            @JsonProperty("stderr") String stderr,
            @JsonProperty("expectedOutput") @JsonAlias("expected_output") String expectedOutput,
            @JsonProperty("actualOutput") @JsonAlias("actual_output") String actualOutput,
            @JsonProperty("score") BigDecimal score
        ) {
            this.testId = testId;
            this.isPublic = isPublic;
            this.status = status;
            this.durationMs = durationMs;
            this.stdout = stdout;
            this.stderr = stderr;
            this.expectedOutput = expectedOutput;
            this.actualOutput = actualOutput;
            this.score = score;
        }
    }
}
