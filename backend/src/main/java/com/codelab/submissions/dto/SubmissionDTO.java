package com.codelab.submissions.dto;

import com.codelab.submissions.domain.Submission;
import java.time.Instant;
import java.util.UUID;

public record SubmissionDTO(
    UUID id,
    UUID studentId,
    String studentName,
    UUID activityId,
    String activityName,
    UUID exerciseVersionId,
    String exerciseTitle,
    String language,
    String status,
    String sourceCode,
    Instant createdAt
) {
    public static SubmissionDTO fromEntity(Submission submission) {
        return new SubmissionDTO(
            submission.getId(),
            submission.getStudent().getId(),
            submission.getStudent().getFullName(),
            submission.getActivityVersion().getActivity().getId(),
            submission.getActivityVersion().getActivity().getName(),
            submission.getExerciseVersion().getId(),
            submission.getExerciseVersion().getTitle(),
            submission.getLanguage(),
            submission.getStatus(),
            submission.getSourceCode(),
            submission.getCreatedAt()
        );
    }
}

