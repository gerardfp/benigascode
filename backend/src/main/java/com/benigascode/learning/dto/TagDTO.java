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
    Instant createdAt,
    long studentCount,
    long spaceCount
) {
    public TagDTO(UUID id, String category, String value, String description, String color, String formatted, Instant createdAt) {
        this(id, category, value, description, color, formatted, createdAt, 0, 0);
    }

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

    public static TagDTO fromEntityWithUsage(Tag tag, long studentCount, long spaceCount) {
        if (tag == null) return null;
        return new TagDTO(
            tag.getId(),
            tag.getCategory(),
            tag.getValue(),
            tag.getDescription(),
            tag.getEffectiveColor(),
            tag.getFormatted(),
            tag.getCreatedAt(),
            studentCount,
            spaceCount
        );
    }
}
