package com.codelab.learning.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record EnrollStudentRequest(
    @NotNull(message = "El ID de usuario es obligatorio")
    UUID userId,

    UUID groupId
) {}

