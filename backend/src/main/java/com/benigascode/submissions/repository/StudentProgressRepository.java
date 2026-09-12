package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.StudentProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentProgressRepository extends JpaRepository<StudentProgress, UUID> {
    Optional<StudentProgress> findByStudentIdAndExerciseIdAndActivityId(UUID studentId, UUID exerciseId, UUID activityId);
    Optional<StudentProgress> findByStudentIdAndExerciseIdAndActivityIsNull(UUID studentId, UUID exerciseId);

    List<StudentProgress> findByStudentIdOrderByUpdatedAtDesc(UUID studentId);

    @Query("SELECT sp FROM StudentProgress sp WHERE sp.activity.course.id = :courseId ORDER BY sp.updatedAt DESC")
    List<StudentProgress> findByCourseId(UUID courseId);
}

