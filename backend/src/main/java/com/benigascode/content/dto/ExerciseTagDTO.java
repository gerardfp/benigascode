package com.benigascode.content.dto;

import java.util.List;
import java.util.UUID;

public record ExerciseTagDTO(
    String name,
    String color,
    long exerciseCount,
    List<UUID> exerciseIds
) {
    public ExerciseTagDTO(String name, String color, long exerciseCount) {
        this(name, color, exerciseCount, List.of());
    }
}
