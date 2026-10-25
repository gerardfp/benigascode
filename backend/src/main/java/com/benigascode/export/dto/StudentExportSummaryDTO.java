package com.benigascode.export.dto;

import java.util.List;

public record StudentExportSummaryDTO(
    int startedCollectionsCount,
    int exercisesCount,
    List<ExportExerciseItemDTO> exercises
) {}
