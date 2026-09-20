package com.benigascode.content.dto;

import java.time.Instant;
import java.util.UUID;

public record ExerciseDraftDTO(
    UUID id,
    UUID exerciseId,
    String markdown,
    Instant updatedAt
) {}
