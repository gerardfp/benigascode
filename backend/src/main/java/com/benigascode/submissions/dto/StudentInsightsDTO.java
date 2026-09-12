package com.benigascode.submissions.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StudentInsightsDTO(
    int totalExercises,
    int completedExercises,
    int attemptedExercises,
    int notStartedExercises,
    int totalSubmissions,
    double completionPercentage,
    double averageScore,
    List<CollectionProgressSummary> collections,
    List<TagProgressSummary> tags,
    List<DailyActivityItem> activityTimeline,
    List<StudentExerciseDetailItem> exercises
) {
    public record CollectionProgressSummary(
        UUID collectionId,
        String slug,
        String title,
        int totalExercises,
        int completedExercises,
        int attemptedExercises,
        double completionPercentage,
        double averageScore
    ) {}

    public record TagProgressSummary(
        String tag,
        int totalExercises,
        int completedExercises,
        int attemptedExercises,
        double completionPercentage
    ) {}

    public record DailyActivityItem(
        String date,
        int submissionsCount,
        int passedCount
    ) {}

    public record StudentExerciseDetailItem(
        UUID exerciseId,
        UUID exerciseVersionId,
        String slug,
        String title,
        UUID collectionId,
        String collectionTitle,
        List<String> tags,
        String status, // PASSED, MASTERED, ATTEMPTED, NOT_STARTED
        double bestScore,
        int testsPassed,
        int totalTests,
        double passPercentage,
        int totalSubmissions,
        Instant lastSubmissionAt
    ) {}
}

