package com.benigascode.content.dto;

import java.util.UUID;

public record AssetDTO(
    UUID id,
    String filename,
    String contentType,
    long sizeBytes,
    String url
) {}

