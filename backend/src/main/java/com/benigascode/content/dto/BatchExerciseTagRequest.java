package com.benigascode.content.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BatchExerciseTagRequest(
    @NotEmpty(message = "Debe seleccionar al menos un ejercicio")
    List<UUID> exerciseIds,
    String tag,
    UUID tagId
) {}

