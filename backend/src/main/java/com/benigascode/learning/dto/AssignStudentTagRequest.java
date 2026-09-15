package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record AssignStudentTagRequest(
    @NotNull(message = "El tagId es obligatorio")
    UUID tagId,
    Instant validFrom,
    Instant validUntil
) {
}

