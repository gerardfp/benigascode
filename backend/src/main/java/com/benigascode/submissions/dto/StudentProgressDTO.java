package com.benigascode.submissions.dto;

import com.benigascode.submissions.domain.StudentProgress;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StudentProgressDTO(
    UUID id,
    UUID studentId,
    String studentName,
    UUID exerciseId,
    String exerciseSlug,
    String exerciseTitle,
    UUID activityId,
    String activityName,
    String status,
    BigDecimal bestScore,
    int totalSubmissions,
    int consumedAttempts,
    String lastStatus,
    UUID lastEvaluationId,
    Instant completedAt,
    Instant updatedAt
) {
    public static StudentProgressDTO fromEntity(StudentProgress sp) {
        return new StudentProgressDTO(
            sp.getId(),
            sp.getStudent().getId(),
            sp.getStudent().getFullName(),
            sp.getExercise().getId(),
            sp.getExercise().getSlug(),
            sp.getLastSubmission() != null ? sp.getLastSubmission().getExerciseVersion().getTitle() : null,
            sp.getActivity() != null ? sp.getActivity().getId() : null,
            sp.getActivity() != null ? sp.getActivity().getName() : null,
            sp.getStatus(),
            sp.getBestScore(),
            sp.getTotalSubmissions(),
            sp.getConsumedAttempts(),
            sp.getLastStatus(),
            sp.getLastEvaluation() != null ? sp.getLastEvaluation().getId() : null,
            sp.getCompletedAt(),
            sp.getUpdatedAt()
        );
    }
}

