package com.codelab.audit.service;

import com.codelab.audit.domain.AuditEvent;
import com.codelab.audit.repository.AuditEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID userId, String action, String resourceType, UUID resourceId, String metadata, String ip) {
        AuditEvent event = new AuditEvent(userId, action, resourceType, resourceId, metadata, ip);
        auditEventRepository.save(event);
    }
}

