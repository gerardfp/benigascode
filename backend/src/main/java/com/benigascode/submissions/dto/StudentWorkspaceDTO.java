package com.benigascode.submissions.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentWorkspaceDTO(
    UUID exerciseId,
    String sourceCode,
    Instant updatedAt,
    boolean isStarter
) {}

