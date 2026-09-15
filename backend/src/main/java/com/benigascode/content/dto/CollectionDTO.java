package com.benigascode.content.dto;

import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import java.util.UUID;

public record CollectionDTO(
    UUID id,
    String slug,
    String title,
    String description,
    String visibility,
    int versionNumber
) {
    public static CollectionDTO from(Collection collection, CollectionVersion version) {
        return new CollectionDTO(
            collection.getId(),
            collection.getSlug(),
            version != null ? version.getTitle() : collection.getSlug(),
            version != null ? version.getDescription() : "",
            collection.getVisibility(),
            version != null ? version.getVersionNumber() : 1
        );
    }

    public static CollectionDTO from(Collection collection) {
        return from(collection, null);
    }
}

