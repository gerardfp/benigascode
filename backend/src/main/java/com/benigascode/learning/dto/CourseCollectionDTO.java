package com.benigascode.learning.dto;

import java.util.List;
import java.util.UUID;

public record CourseCollectionDTO(
    UUID id,
    UUID courseId,
    UUID collectionId,
    String slug,
    String title,
    String description,
    String visibility,
    boolean assignedAllStudents,
    List<UUID> assignedStudentIds,
    int assignedStudentsCount,
    int totalCourseStudents
) {}

