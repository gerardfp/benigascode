package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateInvitationRequest(
    @NotBlank(message = "El código de invitación es obligatorio")
    String code,
    String description,
    Boolean active
) {}

