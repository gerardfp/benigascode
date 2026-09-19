package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BatchExerciseTagRequest(
    @NotEmpty(message = "Debe seleccionar al menos un ejercicio")
    List<UUID> exerciseIds,
    @NotBlank(message = "La etiqueta no puede estar vacía")
    String tag
) {}
