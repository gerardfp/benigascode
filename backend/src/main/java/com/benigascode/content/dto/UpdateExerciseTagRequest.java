package com.benigascode.content.dto;

import jakarta.validation.constraints.Size;

public record UpdateExerciseTagRequest(
    @Size(max = 100, message = "El nuevo nombre no puede superar 100 caracteres")
    String newName,

    @Size(max = 20, message = "El color no puede superar 20 caracteres")
    String color
) {}
