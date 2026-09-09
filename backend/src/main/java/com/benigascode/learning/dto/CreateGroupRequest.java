package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateGroupRequest(
    @NotBlank(message = "El nombre del grupo es obligatorio")
    String name
) {}

