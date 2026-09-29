package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;

public record MergeExerciseTagsRequest(
    @NotBlank(message = "La etiqueta origen es requerida")
    String sourceTag,

    @NotBlank(message = "La etiqueta destino es requerida")
    String targetTag
) {}
