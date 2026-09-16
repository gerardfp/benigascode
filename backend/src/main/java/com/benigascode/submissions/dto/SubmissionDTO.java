package com.benigascode.submissions.dto;

import com.benigascode.submissions.domain.Submission;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SubmissionDTO(
    UUID id,
    UUID studentId,
    String studentName,
    UUID activityId,
    String activityName,
    UUID exerciseId,
    UUID exerciseVersionId,
    String exerciseTitle,
    UUID teachingSpaceId,
    UUID courseId,
    UUID courseCollectionId,
    UUID collectionId,
    String language,
    String status,
    String sourceCode,
    String sourceHash,
    int attemptNumber,
    Instant createdAt,
    String evaluationStatus,
    BigDecimal score,
    int testsPassed,
    int totalTests,
    Boolean compileSuccess
) {
    public static SubmissionDTO fromEntity(Submission submission) {
        return fromEntity(submission, null, null, 0, 0, null);
    }

    public static SubmissionDTO fromEntity(
            Submission submission,
            String evaluationStatus,
            BigDecimal score,
            int testsPassed,
            int totalTests,
            Boolean compileSuccess
    ) {
        UUID actId = submission.getActivityVersion() != null && submission.getActivityVersion().getActivity() != null ?
                submission.getActivityVersion().getActivity().getId() : null;
        String actName = submission.getActivityVersion() != null && submission.getActivityVersion().getActivity() != null ?
                submission.getActivityVersion().getActivity().getName() : "Práctica directa";

        UUID exId = submission.getExerciseVersion() != null && submission.getExerciseVersion().getExercise() != null ?
                submission.getExerciseVersion().getExercise().getId() : null;

        return new SubmissionDTO(
            submission.getId(),
            submission.getStudent().getId(),
            submission.getStudent().getFullName(),
            actId,
            actName,
            exId,
            submission.getExerciseVersion().getId(),
            submission.getExerciseVersion().getTitle(),
            submission.getTeachingSpaceId(),
            submission.getCourseId(),
            null,
            submission.getCollectionId(),
            submission.getLanguage(),
            submission.getStatus(),
            submission.getSourceCode(),
            submission.getSourceHash(),
            submission.getAttemptNumber(),
            submission.getCreatedAt(),
            evaluationStatus,
            score,
            testsPassed,
            totalTests,
            compileSuccess
        );
    }
}
