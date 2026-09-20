package com.benigascode.content.dto;

import jakarta.validation.constraints.NotNull;

public record SaveExerciseDraftRequest(
    @NotNull(message = "El contenido markdown es obligatorio")
    String markdown
) {}
