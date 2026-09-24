package com.benigascode.identity.dto;

import com.benigascode.identity.domain.InvitationCode;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.dto.TagDTO;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record InvitationCodeDTO(
    UUID id,
    String code,
    String description,
    boolean active,
    String createdByUsername,
    String createdByFullName,
    List<TagDTO> tags,
    Instant createdAt,
    Instant updatedAt
) {
    public static InvitationCodeDTO fromEntity(InvitationCode ic) {
        List<TagDTO> tagDTOs = ic.getTags() != null
            ? ic.getTags().stream()
                .sorted(Comparator.comparing(Tag::getCategory).thenComparing(Tag::getValue))
                .map(TagDTO::fromEntity)
                .toList()
            : List.of();

        return new InvitationCodeDTO(
            ic.getId(),
            ic.getCode(),
            ic.getDescription(),
            ic.isActive(),
            ic.getCreatedBy() != null ? ic.getCreatedBy().getUsername() : null,
            ic.getCreatedBy() != null ? ic.getCreatedBy().getFullName() : null,
            tagDTOs,
            ic.getCreatedAt(),
            ic.getUpdatedAt()
        );
    }
}
