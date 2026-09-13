package com.benigascode.identity.dto;

public record ValidateInvitationResponse(
    boolean valid,
    String code,
    String description,
    String message
) {}

