package com.benigascode.learning.dto;

import com.benigascode.learning.domain.Group;
import java.util.UUID;

public record GroupDTO(
    UUID id,
    UUID courseId,
    String name
) {
    public static GroupDTO fromEntity(Group group) {
        return new GroupDTO(group.getId(), group.getCourse().getId(), group.getName());
    }
}

