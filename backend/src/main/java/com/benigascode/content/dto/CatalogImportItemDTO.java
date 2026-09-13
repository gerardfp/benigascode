package com.benigascode.content.dto;

public record CatalogImportItemDTO(
    String slug,
    String title,
    String type, // EXERCISE or COLLECTION
    boolean existsInDb,
    String action, // CREATE, OVERWRITE, SKIP, CREATE_NEW_SLUG
    String targetSlug
) {}

