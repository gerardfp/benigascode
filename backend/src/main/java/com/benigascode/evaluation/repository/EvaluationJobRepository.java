package com.benigascode.evaluation.repository;

import com.benigascode.evaluation.domain.EvaluationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, UUID> {

    @Query(value = "SELECT * FROM evaluation_jobs WHERE status = 'QUEUED' AND available_at <= NOW() ORDER BY priority DESC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    Optional<EvaluationJob> claimNextJobNative();

    Optional<EvaluationJob> findBySubmissionId(UUID submissionId);

    @Query("SELECT ej FROM EvaluationJob ej WHERE ej.status = 'CLAIMED' AND ej.leaseUntil < :now")
    List<EvaluationJob> findExpiredLeaseJobs(Instant now);

    @Modifying
    @Query("UPDATE EvaluationJob ej SET ej.status = 'QUEUED', ej.workerId = null, ej.leaseUntil = null WHERE ej.id = :id")
    void resetExpiredJob(UUID id);
}

