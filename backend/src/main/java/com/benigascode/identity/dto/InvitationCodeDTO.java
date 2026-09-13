package com.benigascode.identity.dto;

import com.benigascode.identity.domain.InvitationCode;
import java.time.Instant;
import java.util.UUID;

public record InvitationCodeDTO(
    UUID id,
    String code,
    String description,
    boolean active,
    String createdByUsername,
    String createdByFullName,
    Instant createdAt,
    Instant updatedAt
) {
    public static InvitationCodeDTO fromEntity(InvitationCode ic) {
        return new InvitationCodeDTO(
            ic.getId(),
            ic.getCode(),
            ic.getDescription(),
            ic.isActive(),
            ic.getCreatedBy() != null ? ic.getCreatedBy().getUsername() : null,
            ic.getCreatedBy() != null ? ic.getCreatedBy().getFullName() : null,
            ic.getCreatedAt(),
            ic.getUpdatedAt()
        );
    }
}

