package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateTeachingSpaceRequest(
    @NotBlank(message = "El nombre del espacio docente es obligatorio")
    @Size(max = 200, message = "El nombre no puede superar 200 caracteres")
    String name,

    String description,

    List<UUID> contextTagIds,

    List<UUID> requiredTagIds,

    List<UUID> teacherIds,

    List<UUID> collectionIds
) {
    public CreateTeachingSpaceRequest {
        if (contextTagIds == null && requiredTagIds != null) {
            contextTagIds = requiredTagIds;
        }
    }
}

