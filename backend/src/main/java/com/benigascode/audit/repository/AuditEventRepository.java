package com.benigascode.audit.repository;

import com.benigascode.audit.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    List<AuditEvent> findTop50ByOrderByCreatedAtDesc();
    List<AuditEvent> findByUserIdOrderByCreatedAtDesc(UUID userId);
}

