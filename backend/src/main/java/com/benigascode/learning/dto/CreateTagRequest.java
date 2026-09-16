package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTagRequest(
    @NotBlank(message = "La categoría es obligatoria")
    @Size(max = 50, message = "La categoría no puede superar 50 caracteres")
    String category,

    @NotBlank(message = "El valor es obligatorio")
    @Size(max = 100, message = "El valor no puede superar 100 caracteres")
    String value,

    @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
    String description,

    @Size(max = 20, message = "El color no puede superar 20 caracteres")
    String color
) {
    public CreateTagRequest(String category, String value, String description) {
        this(category, value, description, null);
    }
}

