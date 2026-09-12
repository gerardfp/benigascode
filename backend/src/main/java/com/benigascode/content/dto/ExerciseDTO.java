package com.benigascode.content.dto;

import com.benigascode.content.domain.ExerciseVersion;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;

public record ExerciseDTO(
    UUID id,
    UUID exerciseId,
    String slug,
    String title,
    String statement,
    String language,
    String runtimeId,
    int versionNumber,
    String starterCode,
    List<String> tags
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static ExerciseDTO fromVersion(ExerciseVersion version) {
        return fromVersion(version, null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode) {
        List<String> parsedTags = List.of();
        try {
            if (version.getTags() != null && !version.getTags().isBlank()) {
                parsedTags = MAPPER.readValue(version.getTags(), new TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {
        }

        return new ExerciseDTO(
            version.getId(),
            version.getExercise().getId(),
            version.getExercise().getSlug(),
            version.getTitle(),
            version.getStatement(),
            version.getLanguage(),
            version.getRuntimeId(),
            version.getVersionNumber(),
            starterCode,
            parsedTags
        );
    }
}
