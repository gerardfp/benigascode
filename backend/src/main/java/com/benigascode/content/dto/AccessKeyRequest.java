package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;

public record AccessKeyRequest(
    @NotBlank(message = "La clave de acceso es obligatoria")
    String accessKey
) {}

