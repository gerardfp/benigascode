package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record StudentTagRequest(
    @NotBlank(message = "La etiqueta no puede estar vacía")
    String tag
) {}

