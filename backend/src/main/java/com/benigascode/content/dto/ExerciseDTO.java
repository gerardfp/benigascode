package com.benigascode.content.dto;

import com.benigascode.content.domain.ExerciseVersion;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    Instant createdAt,
    Map<String, String> starterTemplates,
    String defaultLanguage
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
        this(id, exerciseId, slug, title, statement, language, runtimeId, versionNumber, starterCode, tags, List.of(), null, Map.of(), language);
    }

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
        List<String> tags,
        List<String> collections,
        Instant createdAt
    ) {
        this(id, exerciseId, slug, title, statement, language, runtimeId, versionNumber, starterCode, tags, collections, createdAt, Map.of(), language);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version) {
        return fromVersion(version, null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode) {
        return fromVersion(version, starterCode, Map.of(), null, List.of(), version.getExercise() != null ? version.getExercise().getCreatedAt() : null);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode, List<String> collections, Instant createdAt) {
        return fromVersion(version, starterCode, Map.of(), null, collections, createdAt);
    }

    public static ExerciseDTO fromVersion(ExerciseVersion version, String starterCode, Map<String, String> starterTemplates, String defaultLanguage, List<String> collections, Instant createdAt) {
        List<String> parsedTags = List.of();
        try {
            if (version.getTags() != null && !version.getTags().isBlank()) {
                parsedTags = MAPPER.readValue(version.getTags(), new TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {
        }

        String effDefaultLang = defaultLanguage != null ? defaultLanguage.toLowerCase() : (version.getLanguage() != null ? version.getLanguage().toLowerCase() : "java");

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
            createdAt != null ? createdAt : (version.getExercise() != null ? version.getExercise().getCreatedAt() : null),
            starterTemplates != null ? starterTemplates : Map.of(),
            effDefaultLang
        );
    }
}
