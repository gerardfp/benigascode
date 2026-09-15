package com.benigascode.identity.dto;

import com.benigascode.learning.dto.StudentTagDTO;
import java.time.Instant;
import java.util.Collections;
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
    List<String> tags,
    List<StudentTagDTO> activeTags,
    List<StudentSpaceDTO> spaces
) {
    public TeacherStudentDTO(
        UUID id,
        String username,
        String fullName,
        String githubUsername,
        String avatarUrl,
        Instant createdAt,
        List<StudentCourseMembershipDTO> courses,
        List<String> tags
    ) {
        this(id, username, fullName, githubUsername, avatarUrl, createdAt, courses, tags, Collections.emptyList(), Collections.emptyList());
    }

    public record StudentSpaceDTO(
        UUID spaceId,
        String spaceName
    ) {}

    public record StudentCourseMembershipDTO(
        UUID courseId,
        String courseName,
        String courseCode,
        String academicYear,
        UUID groupId,
        String groupName
    ) {}
}
