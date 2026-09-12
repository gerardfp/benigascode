package com.benigascode.submissions.dto;

import jakarta.validation.constraints.NotNull;

public record SaveWorkspaceRequest(
    @NotNull(message = "El código fuente es obligatorio")
    String sourceCode
) {}

