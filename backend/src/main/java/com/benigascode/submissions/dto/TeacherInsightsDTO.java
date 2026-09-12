package com.benigascode.submissions.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TeacherInsightsDTO(
    String scope, // "GENERAL", "GROUP", "STUDENT"
    UUID courseId,
    String courseName,
    UUID groupId,
    String groupName,
    UUID studentId,
    String studentName,
    int totalStudents,
    int totalSubmissions,
    int totalExercisesSolved,
    double overallPassRate,
    double overallAverageScore,
    List<DifficultExerciseItem> difficultExercises,
    Map<String, Integer> scoreDistribution,
    List<DailyActivityItem> activityTimeline,
    List<GroupSummaryItem> groups,
    List<StudentLeaderboardItem> students,
    StudentInsightsDTO studentDetail
) {
    public record DifficultExerciseItem(
        UUID exerciseId,
        String slug,
        String title,
        int totalSubmissions,
        int passedSubmissions,
        double passRate
    ) {}

    public record DailyActivityItem(
        String date,
        int submissionsCount,
        int passedCount
    ) {}

    public record GroupSummaryItem(
        UUID groupId,
        String groupName,
        UUID courseId,
        String courseName,
        int studentCount,
        int totalSubmissions,
        double averageScore,
        double passRate
    ) {}

    public record StudentLeaderboardItem(
        UUID studentId,
        String studentName,
        String studentEmail,
        UUID groupId,
        String groupName,
        int exercisesSolved,
        int exercisesAttempted,
        double averageScore,
        int totalSubmissions,
        Instant lastActiveAt
    ) {}
}

