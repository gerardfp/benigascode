package com.codelab.evaluation.repository;

import com.codelab.evaluation.domain.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, UUID> {
    List<TestResult> findByEvaluationId(UUID evaluationId);
}

