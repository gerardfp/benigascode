package com.benigascode.activities.dto;

import com.benigascode.activities.domain.Activity;
import com.benigascode.activities.domain.ActivityVersion;
import java.time.Instant;
import java.util.UUID;

public record ActivityDTO(
    UUID id,
    UUID teachingSpaceId,
    String teachingSpaceName,
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
            activity.getTeachingSpace() != null ? activity.getTeachingSpace().getId() : null,
            activity.getTeachingSpace() != null ? activity.getTeachingSpace().getName() : null,
            activity.getName(),
            activity.getType(),
            version != null ? version.getId() : null,
            version != null ? version.getVersionNumber() : 1,
            version != null && version.getExerciseVersion() != null ? version.getExerciseVersion().getId() : null,
            version != null && version.getExerciseVersion() != null ? version.getExerciseVersion().getTitle() : null,
            version != null ? version.getMaxAttempts() : null,
            version != null ? version.getAvailableFrom() : null,
            version != null ? version.getAvailableUntil() : null,
            version != null ? version.getDueAt() : null,
            version != null && version.isAvailableNow()
        );
    }

    // Alias de compatibilidad
    public UUID courseId() {
        return teachingSpaceId;
    }
}
