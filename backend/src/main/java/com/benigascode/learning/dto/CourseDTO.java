package com.benigascode.learning.dto;

import com.benigascode.learning.domain.Course;
import java.time.Instant;
import java.util.UUID;

public record CourseDTO(
    UUID id,
    String name,
    String code,
    String academicYear,
    String description,
    Instant createdAt
) {
    public static CourseDTO fromEntity(Course course) {
        return new CourseDTO(
            course.getId(),
            course.getName(),
            course.getCode(),
            course.getAcademicYear(),
            course.getDescription(),
            course.getCreatedAt()
        );
    }
}

