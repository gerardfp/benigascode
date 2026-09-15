package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.StudentProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentProgressRepository extends JpaRepository<StudentProgress, UUID> {

    Optional<StudentProgress> findByStudentIdAndExerciseId(UUID studentId, UUID exerciseId);

    default Optional<StudentProgress> findByStudentIdAndExerciseIdAndActivityId(UUID studentId, UUID exerciseId, UUID activityId) {
        return findByStudentIdAndExerciseId(studentId, exerciseId);
    }

    default Optional<StudentProgress> findByStudentIdAndExerciseIdAndActivityIsNull(UUID studentId, UUID exerciseId) {
        return findByStudentIdAndExerciseId(studentId, exerciseId);
    }

    List<StudentProgress> findByStudentIdOrderByUpdatedAtDesc(UUID studentId);

    List<StudentProgress> findByStudentIdInOrderByUpdatedAtDesc(java.util.Collection<UUID> studentIds);

    @Query("SELECT sp FROM StudentProgress sp WHERE (sp.activity IS NOT NULL AND sp.activity.teachingSpace.id = :spaceId) ORDER BY sp.updatedAt DESC")
    List<StudentProgress> findByTeachingSpaceId(@Param("spaceId") UUID spaceId);

    default List<StudentProgress> findByCourseId(UUID courseId) {
        return findByTeachingSpaceId(courseId);
    }
}
