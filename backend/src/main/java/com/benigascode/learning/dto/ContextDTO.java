package com.benigascode.learning.dto;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record ContextDTO(
    List<UUID> tagIds
) {
    public List<UUID> getSafeTagIds() {
        return tagIds != null ? tagIds : Collections.emptyList();
    }
}

