package com.benigascode.export.dto;

public record ExportExerciseItemDTO(
    String slug,
    String title,
    boolean hasSubmission,
    String language,
    int publicTestsCount
) {}
