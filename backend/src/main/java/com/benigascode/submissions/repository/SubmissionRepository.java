package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND s.activityVersion.id = :activityVersionId ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndActivityVersion(UUID studentId, UUID activityVersionId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND s.exerciseVersion.exercise.id = :exerciseId ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndExercise(UUID studentId, UUID exerciseId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND s.exerciseVersion.exercise.id = :exerciseId AND (:activityId IS NULL OR (s.activityVersion IS NOT NULL AND s.activityVersion.activity.id = :activityId)) ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndExerciseAndOptionalActivity(UUID studentId, UUID exerciseId, UUID activityId);

    @Query("SELECT s FROM Submission s WHERE s.teachingSpaceId = :teachingSpaceId OR (s.activityVersion IS NOT NULL AND s.activityVersion.activity.teachingSpace.id = :teachingSpaceId) ORDER BY s.createdAt DESC")
    List<Submission> findByTeachingSpaceId(UUID teachingSpaceId);

    default List<Submission> findByCourseId(UUID courseId) {
        return findByTeachingSpaceId(courseId);
    }

    @Query("SELECT DISTINCT s.collectionId FROM Submission s WHERE s.student.id = :studentId AND s.collectionId IS NOT NULL")
    List<UUID> findParticipatedCollectionIdsByStudentId(UUID studentId);

    @Query("SELECT DISTINCT LOWER(s.language) FROM Submission s WHERE s.student.id = :studentId AND s.collectionId = :collectionId AND s.language IS NOT NULL")
    List<String> findUsedLanguagesByStudentAndCollection(UUID studentId, UUID collectionId);

    List<Submission> findAllByOrderByCreatedAtDesc();
}
