package com.benigascode.identity.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthorizedTeacherDTO(
    UUID id,
    String githubUsername,
    String notes,
    Instant createdAt,
    String createdByName,
    boolean registered,
    String fullName,
    String avatarUrl,
    boolean isPrimary
) {}

