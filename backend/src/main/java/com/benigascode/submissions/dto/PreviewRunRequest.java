package com.benigascode.submissions.dto;

import jakarta.validation.constraints.NotBlank;

public record PreviewRunRequest(
    @NotBlank(message = "El código fuente es obligatorio")
    String sourceCode,

    String language
) {}

