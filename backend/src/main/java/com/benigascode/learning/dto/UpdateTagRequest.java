package com.benigascode.learning.dto;

import jakarta.validation.constraints.Size;

public record UpdateTagRequest(
    @Size(max = 100, message = "La categoría no puede superar 100 caracteres")
    String category,

    @Size(max = 100, message = "El valor no puede superar 100 caracteres")
    String value,

    @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
    String description,

    @Size(max = 20, message = "El color no puede superar 20 caracteres")
    String color
) {
    public UpdateTagRequest(String description, String color) {
        this(null, null, description, color);
    }
}
