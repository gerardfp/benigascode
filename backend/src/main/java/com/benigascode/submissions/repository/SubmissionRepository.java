package com.benigascode.submissions.repository;

import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.submissions.domain.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND s.activityVersion.id = :activityVersionId ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndActivityVersion(UUID studentId, UUID activityVersionId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND (s.exerciseVersion.exercise.id = :exerciseId OR (s.exerciseVersion IS NULL AND s.exerciseSlug = (SELECT e.slug FROM Exercise e WHERE e.id = :exerciseId))) ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndExercise(@Param("studentId") UUID studentId, @Param("exerciseId") UUID exerciseId);

    @Query("SELECT s FROM Submission s WHERE s.student.id = :studentId AND (s.exerciseVersion.exercise.id = :exerciseId OR (s.exerciseVersion IS NULL AND s.exerciseSlug = (SELECT e.slug FROM Exercise e WHERE e.id = :exerciseId))) AND (:activityId IS NULL OR (s.activityVersion IS NOT NULL AND s.activityVersion.activity.id = :activityId)) ORDER BY s.createdAt DESC")
    List<Submission> findByStudentAndExerciseAndOptionalActivity(@Param("studentId") UUID studentId, @Param("exerciseId") UUID exerciseId, @Param("activityId") UUID activityId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Submission s SET s.exerciseSlug = :slug WHERE s.exerciseVersion.id IN (SELECT ev.id FROM ExerciseVersion ev WHERE ev.exercise.id = :exerciseId)")
    int updateExerciseSlugForExercise(@Param("exerciseId") UUID exerciseId, @Param("slug") String slug);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Submission s SET s.exerciseVersion = :exerciseVersion WHERE s.exerciseSlug = :slug AND s.exerciseVersion IS NULL")
    int reassociateSubmissionsForSlug(@Param("slug") String slug, @Param("exerciseVersion") ExerciseVersion exerciseVersion);

    @Query("SELECT s FROM Submission s WHERE s.exerciseSlug = :slug AND s.exerciseVersion IS NULL ORDER BY s.createdAt ASC")
    List<Submission> findOrphanedByExerciseSlug(@Param("slug") String slug);

    @Query("SELECT DISTINCT s.student.id FROM Submission s WHERE s.exerciseSlug = :slug")
    List<UUID> findStudentIdsByExerciseSlug(@Param("slug") String slug);

    @Query("SELECT s FROM Submission s " +
           "LEFT JOIN s.activityVersion av " +
           "LEFT JOIN av.activity act " +
           "WHERE s.teachingSpaceId = :teachingSpaceId " +
           "OR act.teachingSpace.id = :teachingSpaceId " +
           "OR (s.collectionId IS NOT NULL AND s.collectionId IN (SELECT c.id FROM TeachingSpace ts JOIN ts.collections c WHERE ts.id = :teachingSpaceId)) " +
           "ORDER BY s.createdAt DESC")
    List<Submission> findByTeachingSpaceId(@Param("teachingSpaceId") UUID teachingSpaceId);

    default List<Submission> findByCourseId(UUID courseId) {
        return findByTeachingSpaceId(courseId);
    }

    @Query("SELECT DISTINCT s.collectionId FROM Submission s WHERE s.student.id = :studentId AND s.collectionId IS NOT NULL")
    List<UUID> findParticipatedCollectionIdsByStudentId(UUID studentId);

    @Query("SELECT DISTINCT LOWER(s.language) FROM Submission s WHERE s.student.id = :studentId AND s.collectionId = :collectionId AND s.language IS NOT NULL")
    List<String> findUsedLanguagesByStudentAndCollection(UUID studentId, UUID collectionId);

    List<Submission> findAllByOrderByCreatedAtDesc();
}
