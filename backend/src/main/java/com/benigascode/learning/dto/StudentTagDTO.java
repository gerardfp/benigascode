package com.benigascode.learning.dto;

import com.benigascode.learning.domain.StudentTag;

import java.time.Instant;
import java.util.UUID;

public record StudentTagDTO(
    UUID id,
    UUID studentId,
    TagDTO tag,
    UUID tagId,
    String category,
    String value,
    String color,
    Instant validFrom,
    Instant validUntil,
    boolean active,
    UUID createdById,
    String createdByName,
    Instant createdAt
) {
    public static StudentTagDTO fromEntity(StudentTag st) {
        if (st == null) return null;
        TagDTO tagDTO = TagDTO.fromEntity(st.getTag());
        return new StudentTagDTO(
            st.getId(),
            st.getStudent().getId(),
            tagDTO,
            st.getTag() != null ? st.getTag().getId() : null,
            st.getTag() != null ? st.getTag().getCategory() : null,
            st.getTag() != null ? st.getTag().getValue() : null,
            st.getTag() != null ? st.getTag().getEffectiveColor() : null,
            st.getValidFrom(),
            st.getValidUntil(),
            st.isActive(),
            st.getCreatedBy() != null ? st.getCreatedBy().getId() : null,
            st.getCreatedBy() != null ? st.getCreatedBy().getFullName() : null,
            st.getCreatedAt()
        );
    }
}
