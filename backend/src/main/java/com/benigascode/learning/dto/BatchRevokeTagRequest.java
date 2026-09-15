package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BatchRevokeTagRequest(
    @NotEmpty(message = "Debe especificar al menos un alumno")
    List<UUID> studentIds,

    @NotNull(message = "El tagId es obligatorio")
    UUID tagId
) {
}

