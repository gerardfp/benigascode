package com.benigascode.learning.dto;

import java.util.List;
import java.util.UUID;

public record AssignCourseCollectionRequest(
    Boolean assignedAllStudents,
    List<UUID> studentIds
) {}

