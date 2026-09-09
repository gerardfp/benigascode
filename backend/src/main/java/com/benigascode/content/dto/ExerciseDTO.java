package com.benigascode.content.dto;

import com.benigascode.content.domain.ExerciseVersion;
import java.util.UUID;

public record ExerciseDTO(
    UUID id,
    UUID exerciseId,
    String slug,
    String title,
    String statement,
    String language,
    String runtimeId,
    int versionNumber
) {
    public static ExerciseDTO fromVersion(ExerciseVersion version) {
        return new ExerciseDTO(
            version.getId(),
            version.getExercise().getId(),
            version.getExercise().getSlug(),
            version.getTitle(),
            version.getStatement(),
            version.getLanguage(),
            version.getRuntimeId(),
            version.getVersionNumber()
        );
    }
}

