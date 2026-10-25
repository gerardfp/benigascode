package com.benigascode.export.dto;

public record StudentExportResultDTO(
    boolean success,
    String repoUrl,
    int exercisesCount,
    int filesCount,
    String message
) {}
