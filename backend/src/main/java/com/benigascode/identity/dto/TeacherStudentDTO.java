package com.benigascode.identity.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeacherStudentDTO(
    UUID id,
    String username,
    String fullName,
    String githubUsername,
    String avatarUrl,
    Instant createdAt,
    List<StudentCourseMembershipDTO> courses,
    List<String> tags
) {
    public record StudentCourseMembershipDTO(
        UUID courseId,
        String courseName,
        String courseCode,
        String academicYear,
        UUID groupId,
        String groupName
    ) {}
}

