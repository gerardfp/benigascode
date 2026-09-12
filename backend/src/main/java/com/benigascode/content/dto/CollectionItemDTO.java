package com.benigascode.content.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CollectionItemDTO(
    String type,
    String id,
    UUID exerciseId,
    String exerciseTitle,
    String exerciseSlug,
    String title,
    int position,
    int orderIndex,
    boolean required,
    double weight
) {
    public CollectionItemDTO(String type, String id, UUID exerciseId, String title, int position, boolean required, double weight) {
        this(type, id, exerciseId, title, id, title, position, position, required, weight);
    }

    public CollectionItemDTO(UUID exerciseId, String exerciseTitle, String exerciseSlug, int orderIndex) {
        this("EXERCISE", exerciseSlug, exerciseId, exerciseTitle, exerciseSlug, exerciseTitle, orderIndex, orderIndex, true, 1.0);
    }
}

