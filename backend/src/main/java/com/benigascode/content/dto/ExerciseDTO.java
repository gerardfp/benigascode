package com.benigascode.content.dto;

import com.benigascode.content.domain.ExerciseVersion;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
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
    List<String> tags,
    List<String> collections,
    Instant createdAt
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public ExerciseDTO(
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
        this(id, exerciseId, slug, title, statement, language, runtimeId, versionNumber, starterCode, tags, List.of(), null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version) {
        return fromVersion(version, null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode) {
        return fromVersion(version, starterCode, List.of(), version.getExercise() != null ? version.getExercise().getCreatedAt() : null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode, List<String> collections, Instant createdAt) {
        List<String> parsedTags = List.of();
        try {
            if (version.getTags() != null && !version.getTags().isBlank()) {
                parsedTags = MAPPER.readValue(version.getTags(), new TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {
        }

        return new ExerciseDTO(
            version.getId(),
            version.getExercise() != null ? version.getExercise().getId() : null,
            version.getExercise() != null ? version.getExercise().getSlug() : null,
            version.getTitle(),
            version.getStatement(),
            version.getLanguage(),
            version.getRuntimeId(),
            version.getVersionNumber(),
            starterCode,
            parsedTags,
            collections != null ? collections : List.of(),
            createdAt != null ? createdAt : (version.getExercise() != null ? version.getExercise().getCreatedAt() : null)
        );
    }
}
