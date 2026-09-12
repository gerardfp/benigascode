package com.benigascode.submissions.dto;

import com.benigascode.evaluation.dto.EvaluationDTO;
import java.time.Instant;
import java.util.UUID;

public record TeacherSubmissionDetailDTO(
    UUID id,
    UUID studentId,
    String studentName,
    String studentEmail,
    String groupName,
    UUID activityId,
    String activityName,
    UUID exerciseId,
    String exerciseSlug,
    String exerciseTitle,
    String language,
    String sourceCode,
    String status,
    int attemptNumber,
    Instant createdAt,
    EvaluationDTO evaluation
) {}

