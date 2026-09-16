package com.benigascode.learning.dto;

import com.benigascode.learning.domain.Tag;

import java.time.Instant;
import java.util.UUID;

public record TagDTO(
    UUID id,
    String category,
    String value,
    String description,
    String color,
    String formatted,
    Instant createdAt
) {
    public static TagDTO fromEntity(Tag tag) {
        if (tag == null) return null;
        return new TagDTO(
            tag.getId(),
            tag.getCategory(),
            tag.getValue(),
            tag.getDescription(),
            tag.getEffectiveColor(),
            tag.getFormatted(),
            tag.getCreatedAt()
        );
    }
}

