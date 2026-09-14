package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddAuthorizedTeacherRequest(
    @NotBlank(message = "El nombre de usuario de GitHub no puede estar vacío")
    @Size(min = 1, max = 100, message = "El usuario de GitHub debe tener entre 1 y 100 caracteres")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "El usuario de GitHub contiene caracteres no válidos")
    String githubUsername,

    @Size(max = 255, message = "Las notas no pueden superar los 255 caracteres")
    String notes
) {}

