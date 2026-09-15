package com.benigascode.learning.dto;

import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.learning.domain.TeachingSpace;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record TeachingSpaceDTO(
    UUID id,
    String name,
    String description,
    List<TagDTO> contextTags,
    List<UserDTO> teachers,
    List<CollectionDTO> collections,
    int studentCount,
    Instant createdAt,
    Instant updatedAt
) {
    public static TeachingSpaceDTO fromEntity(TeachingSpace space, List<TagDTO> contextTags, int studentCount) {
        if (space == null) return null;
        List<UserDTO> teachers = space.getTeachers() != null
            ? space.getTeachers().stream().map(UserDTO::fromEntity).toList()
            : Collections.emptyList();
        List<CollectionDTO> collections = space.getCollections() != null
            ? space.getCollections().stream().map(CollectionDTO::from).toList()
            : Collections.emptyList();

        return new TeachingSpaceDTO(
            space.getId(),
            space.getName(),
            space.getDescription(),
            contextTags != null ? contextTags : Collections.emptyList(),
            teachers,
            collections,
            studentCount,
            space.getCreatedAt(),
            space.getUpdatedAt()
        );
    }
}

