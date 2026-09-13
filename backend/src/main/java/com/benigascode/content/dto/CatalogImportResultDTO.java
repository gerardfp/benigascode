package com.benigascode.content.dto;

import java.util.List;

public record CatalogImportResultDTO(
    String status,
    int totalProcessed,
    int importedNew,
    int overwritten,
    int skipped,
    int renamed,
    int collectionsProcessed,
    String commitHash,
    List<String> errors
) {}

