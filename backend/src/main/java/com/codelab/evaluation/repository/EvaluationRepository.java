package com.codelab.evaluation.repository;

import com.codelab.evaluation.domain.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    List<Evaluation> findBySubmissionIdOrderByCreatedAtDesc(UUID submissionId);

    @Query("SELECT e FROM Evaluation e WHERE e.submission.id = :submissionId ORDER BY e.createdAt DESC LIMIT 1")
    Optional<Evaluation> findLatestBySubmissionId(UUID submissionId);
}

