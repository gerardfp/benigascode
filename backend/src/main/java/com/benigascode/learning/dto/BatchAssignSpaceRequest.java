package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchAssignSpaceRequest(
    @NotEmpty(message = "Debe seleccionarse al menos un alumno")
    List<UUID> studentIds,

    @NotNull(message = "El id del espacio docente es obligatorio")
    UUID spaceId,

    Instant validFrom,
    Instant validUntil
) {
}
