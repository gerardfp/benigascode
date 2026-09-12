package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SaveCollectionRequest(
    @NotBlank(message = "El slug no puede estar vacío")
    String slug,
    @NotBlank(message = "El título no puede estar vacío")
    String title,
    String description,
    String visibility,
    String language,
    String runtimeId,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> scoringConfig,
    Map<String, Object> comparatorConfig,
    Map<String, String> templates,
    List<CollectionItemDTO> items,
    List<UUID> exerciseIds
) {}

