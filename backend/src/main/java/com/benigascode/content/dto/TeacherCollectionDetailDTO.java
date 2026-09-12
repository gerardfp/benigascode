package com.benigascode.content.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TeacherCollectionDetailDTO(
    UUID id,
    String slug,
    String title,
    String description,
    String visibility,
    int versionNumber,
    String language,
    String runtimeId,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> scoringConfig,
    Map<String, Object> comparatorConfig,
    Map<String, String> templates,
    List<CollectionItemDTO> items,
    List<CollectionItemDTO> exercises,
    Instant updatedAt
) {
    public TeacherCollectionDetailDTO(UUID id, String slug, String title, String description, String visibility,
                                    int versionNumber, String language, String runtimeId, Map<String, Object> compileConfig,
                                    Map<String, Object> runConfig, Map<String, Object> scoringConfig,
                                    Map<String, Object> comparatorConfig, Map<String, String> templates,
                                    List<CollectionItemDTO> items, Instant updatedAt) {
        this(id, slug, title, description, visibility, versionNumber, language, runtimeId, compileConfig, runConfig,
             scoringConfig, comparatorConfig, templates, items, items, updatedAt);
    }
}

