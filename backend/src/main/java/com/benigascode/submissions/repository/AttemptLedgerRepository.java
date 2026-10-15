package com.benigascode.submissions.repository;

import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.submissions.domain.AttemptLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttemptLedgerRepository extends JpaRepository<AttemptLedger, UUID> {
    @Query("SELECT COUNT(a) FROM AttemptLedger a WHERE a.student.id = :studentId AND a.activityVersion.id = :activityVersionId AND a.status IN ('RESERVED', 'CONSUMED')")
    long countConsumedAttempts(UUID studentId, UUID activityVersionId);

    @Query("SELECT COUNT(a) FROM AttemptLedger a WHERE a.student.id = :studentId AND a.exerciseVersion.id = :exerciseVersionId AND a.status IN ('RESERVED', 'CONSUMED')")
    long countConsumedExerciseAttempts(UUID studentId, UUID exerciseVersionId);

    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) FROM AttemptLedger a WHERE a.student.id = :studentId AND a.activityVersion.id = :activityVersionId")
    long findMaxAttemptNumberForActivity(UUID studentId, UUID activityVersionId);

    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) FROM AttemptLedger a WHERE a.student.id = :studentId AND a.exerciseVersion.id = :exerciseVersionId")
    long findMaxAttemptNumberForExercise(UUID studentId, UUID exerciseVersionId);

    Optional<AttemptLedger> findBySubmissionId(UUID submissionId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE AttemptLedger a SET a.exerciseVersion = :exerciseVersion WHERE a.exerciseVersion IS NULL AND a.submission.id IN (SELECT s.id FROM Submission s WHERE s.exerciseSlug = :slug)")
    int reassociateAttemptLedgersForSlug(@Param("slug") String slug, @Param("exerciseVersion") ExerciseVersion exerciseVersion);
}
