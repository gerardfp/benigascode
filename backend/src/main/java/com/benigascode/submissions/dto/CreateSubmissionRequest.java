package com.benigascode.submissions.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateSubmissionRequest(
    @NotBlank(message = "El código fuente es obligatorio")
    String sourceCode,

    String language,

    UUID teachingSpaceId,

    UUID courseId,

    UUID courseCollectionId,

    UUID collectionId
) {
    public CreateSubmissionRequest(String sourceCode, String language) {
        this(sourceCode, language, null, null, null, null);
    }

    public UUID getEffectiveTeachingSpaceId() {
        return teachingSpaceId != null ? teachingSpaceId : courseId;
    }
}
