package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND s.activityVersion.id = :activityVersionId ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndActivityVersion(UUID studentId, UUID activityVersionId);

    @Query("SELECT s FROM Submission s WHERE s.activityVersion.activity.course.id = :courseId ORDER BY s.createdAt DESC")
    List<Submission> findByCourseId(UUID courseId);
}

