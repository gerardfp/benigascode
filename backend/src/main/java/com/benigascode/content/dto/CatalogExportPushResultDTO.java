package com.benigascode.content.dto;

public record CatalogExportPushResultDTO(
    boolean success,
    String commitSha,
    int exercisesCount,
    int collectionsCount,
    String message,
    String repositoryUrl
) {}

