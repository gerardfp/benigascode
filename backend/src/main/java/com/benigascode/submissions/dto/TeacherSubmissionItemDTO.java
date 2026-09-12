package com.benigascode.submissions.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TeacherSubmissionItemDTO(
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
    String status,
    String evaluationStatus,
    BigDecimal score,
    int testsPassed,
    int totalTests,
    Boolean compileSuccess,
    int attemptNumber,
    Instant createdAt
) {}

