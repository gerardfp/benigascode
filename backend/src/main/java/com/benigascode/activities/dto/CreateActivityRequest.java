package com.benigascode.activities.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record CreateActivityRequest(
    @NotNull(message = "El ID del curso es obligatorio")
    UUID courseId,

    @NotBlank(message = "El nombre de la actividad es obligatorio")
    String name,

    @NotBlank(message = "El tipo de actividad es obligatorio")
    String type, // PRACTICE, EXAM, ASSIGNMENT

    @NotNull(message = "El ID de la versión del ejercicio es obligatorio")
    UUID exerciseVersionId,

    Integer maxAttempts,
    Instant availableFrom,
    Instant availableUntil,
    Instant dueAt
) {}

