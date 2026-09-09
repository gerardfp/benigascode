package com.codelab.activities.dto;

import com.codelab.activities.domain.Activity;
import com.codelab.activities.domain.ActivityVersion;
import java.time.Instant;
import java.util.UUID;

public record ActivityDTO(
    UUID id,
    UUID courseId,
    String name,
    String type,
    UUID currentVersionId,
    int versionNumber,
    UUID exerciseVersionId,
    String exerciseTitle,
    Integer maxAttempts,
    Instant availableFrom,
    Instant availableUntil,
    Instant dueAt,
    boolean isAvailableNow
) {
    public static ActivityDTO from(Activity activity, ActivityVersion version) {
        return new ActivityDTO(
            activity.getId(),
            activity.getCourse().getId(),
            activity.getName(),
            activity.getType(),
            version != null ? version.getId() : null,
            version != null ? version.getVersionNumber() : 1,
            version != null ? version.getExerciseVersion().getId() : null,
            version != null ? version.getExerciseVersion().getTitle() : null,
            version != null ? version.getMaxAttempts() : null,
            version != null ? version.getAvailableFrom() : null,
            version != null ? version.getAvailableUntil() : null,
            version != null ? version.getDueAt() : null,
            version != null && version.isAvailableNow()
        );
    }
}

