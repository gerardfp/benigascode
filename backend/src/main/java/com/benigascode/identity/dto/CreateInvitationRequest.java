package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

public record CreateInvitationRequest(
    @NotBlank(message = "El código de invitación es obligatorio")
    String code,
    String description,
    Boolean active,
    List<UUID> tagIds
) {}
