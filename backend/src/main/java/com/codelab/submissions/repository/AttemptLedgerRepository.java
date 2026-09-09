package com.codelab.submissions.repository;

import com.codelab.submissions.domain.AttemptLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AttemptLedgerRepository extends JpaRepository<AttemptLedger, UUID> {
    @Query("SELECT COUNT(a) FROM AttemptLedger a WHERE a.student.id = :studentId AND a.activityVersion.id = :activityVersionId AND a.status IN ('RESERVED', 'CONSUMED')")
    long countConsumedAttempts(UUID studentId, UUID activityVersionId);
}

