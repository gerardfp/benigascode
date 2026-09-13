package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record ValidateInvitationRequest(
    @NotBlank(message = "La clave de invitación es obligatoria")
    String code
) {}

