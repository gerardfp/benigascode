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
    String runtimeImageDigest,
    Instant startedAt,
    Instant finishedAt,
    Instant createdAt,
    List<TestResultDTO> testResults
) {
    public static EvaluationDTO fromEntity(Evaluation eval, List<TestResultDTO> results) {
        return new EvaluationDTO(
            eval.getId(),
            eval.getSubmission().getId(),
            eval.getStatus(),
            eval.getScore(),
            eval.getReason(),
            eval.getRuntimeId(),
            eval.getRuntimeImageDigest(),
            eval.getStartedAt(),
            eval.getFinishedAt(),
            eval.getCreatedAt(),
            results
        );
    }
}

