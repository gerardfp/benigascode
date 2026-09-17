package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;

public record SetCollectionPreferenceRequest(
    @NotBlank(message = "El lenguaje no puede estar vacío")
    String language
) {}

