package com.benigascode.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record GitHubAuthRequest(
    @NotBlank(message = "El código de GitHub es obligatorio")
    String code,
    String invitationCode,
    String redirectUri
) {}

