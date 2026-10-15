package com.benigascode.evaluation.repository;

import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.evaluation.domain.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    List<Evaluation> findBySubmissionIdOrderByCreatedAtDesc(UUID submissionId);

    @Query("SELECT e FROM Evaluation e WHERE e.submission.id = :submissionId ORDER BY e.createdAt DESC LIMIT 1")
    Optional<Evaluation> findLatestBySubmissionId(UUID submissionId);

    @Query("SELECT e FROM Evaluation e WHERE e.submission.student.id = :studentId ORDER BY e.createdAt ASC")
    List<Evaluation> findByStudentId(@Param("studentId") UUID studentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Evaluation e SET e.exerciseVersion = :exerciseVersion WHERE e.exerciseVersion IS NULL AND e.submission.id IN (SELECT s.id FROM Submission s WHERE s.exerciseSlug = :slug)")
    int reassociateEvaluationsForSlug(@Param("slug") String slug, @Param("exerciseVersion") ExerciseVersion exerciseVersion);
}

