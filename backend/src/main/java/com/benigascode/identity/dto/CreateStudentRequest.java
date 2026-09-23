package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateStudentRequest(
    @NotBlank(message = "El nombre de usuario o email es obligatorio")
    @Size(max = 100, message = "El nombre de usuario no puede exceder 100 caracteres")
    String username,

    @NotBlank(message = "El nombre completo es obligatorio")
    @Size(max = 150, message = "El nombre completo no puede exceder 150 caracteres")
    String fullName,

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, max = 100, message = "La contraseña debe tener al menos 6 caracteres")
    String password
) {}

