package com.benigascode.content.dto;

import java.util.List;
import java.util.UUID;

public record CollectionProgressDTO(
    UUID collectionId,
    String collectionTitle,
    int totalExercises,
    int completedExercises,
    int attemptedExercises,
    int notStartedExercises,
    double completionPercentage,
    double averageScore,
    List<ExerciseProgressItemDTO> items
) {
    public record ExerciseProgressItemDTO(
        UUID exerciseId,
        UUID exerciseVersionId,
        String slug,
        String title,
        String status, // PASSED, MASTERED, ATTEMPTED, NOT_STARTED
        double bestScore,
        int testsPassed,
        int totalTests,
        double passPercentage,
        int totalSubmissions
    ) {}
}

