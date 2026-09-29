package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateExerciseTagRequest(
    @NotBlank(message = "El nombre de la etiqueta no puede estar vacío")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    String name,

    @Size(max = 20, message = "El color no puede superar 20 caracteres")
    String color
) {}
