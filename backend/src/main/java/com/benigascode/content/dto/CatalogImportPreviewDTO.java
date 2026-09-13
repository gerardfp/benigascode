package com.benigascode.content.dto;

import java.util.List;

public record CatalogImportPreviewDTO(
    String repositoryUrl,
    String branch,
    String commitHash,
    int totalExercises,
    int totalCollections,
    int existingExercisesCount,
    int newExercisesCount,
    int existingCollectionsCount,
    int newCollectionsCount,
    CatalogConflictStrategy strategy,
    List<CatalogImportItemDTO> items
) {}

