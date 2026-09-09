package com.codelab.content.dto;

import java.time.Instant;
import java.util.UUID;

public record CreateAccessKeyResponse(
    UUID id,
    UUID collectionId,
    String rawKey, // Se muestra solo una vez al crearla
    Integer maxUses,
    Instant expiresAt
) {}

