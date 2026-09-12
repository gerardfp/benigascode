package com.benigascode.evaluation.dto;

import com.benigascode.evaluation.domain.Evaluation;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EvaluationDTO(
    UUID id,
    UUID submissionId,
    String status,
    BigDecimal score,
    String reason,
    String runtimeId,
    String actualRuntime,
    String runtimeImageDigest,
    Boolean compileSuccess,
    String compileStdout,
    String compileStderr,
    int totalTests,
    int passedTests,
    int totalPublicTests,
    int passedPublicTests,
    int totalPrivateTests,
    int passedPrivateTests,
    Instant startedAt,
    Instant finishedAt,
    Instant createdAt,
    List<TestResultDTO> testResults
) {
    public static EvaluationDTO fromEntity(Evaluation eval, List<TestResultDTO> results) {
        int total = results != null ? results.size() : 0;
        int passed = 0;
        int pubTotal = 0;
        int pubPassed = 0;
        int privTotal = 0;
        int privPassed = 0;

        if (results != null) {
            for (TestResultDTO tr : results) {
                boolean isPassed = "PASSED".equalsIgnoreCase(tr.status());
                if (isPassed) passed++;
                if (tr.isPublic()) {
                    pubTotal++;
                    if (isPassed) pubPassed++;
                } else {
                    privTotal++;
                    if (isPassed) privPassed++;
                }
            }
        }

        return new EvaluationDTO(
            eval.getId(),
            eval.getSubmission().getId(),
            eval.getStatus(),
            eval.getScore(),
            eval.getReason(),
            eval.getRuntimeId(),
            eval.getActualRuntime(),
            eval.getRuntimeImageDigest(),
            eval.getCompileSuccess(),
            eval.getCompileStdout(),
            eval.getCompileStderr(),
            total,
            passed,
            pubTotal,
            pubPassed,
            privTotal,
            privPassed,
            eval.getStartedAt(),
            eval.getFinishedAt(),
            eval.getCreatedAt(),
            results
        );
    }
}
