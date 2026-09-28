package com.benigascode.learning.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record UpdateTeachingSpaceRequest(
    @NotBlank(message = "El nombre del espacio docente es obligatorio")
    @Size(max = 200, message = "El nombre no puede superar 200 caracteres")
    String name,

    String description,

    @JsonAlias({"requiredTagIds", "contextTagIds"})
    List<UUID> contextTagIds
) {
}

