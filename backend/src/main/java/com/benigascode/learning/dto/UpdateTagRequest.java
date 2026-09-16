package com.benigascode.learning.dto;

import jakarta.validation.constraints.Size;

public record UpdateTagRequest(
    @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
    String description,

    @Size(max = 20, message = "El color no puede superar 20 caracteres")
    String color
) {
}

