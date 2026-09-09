package com.codelab.evaluation.service;

import com.codelab.evaluation.domain.EvaluationJob;
import com.codelab.evaluation.repository.EvaluationJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class EvaluationQueueSupervisor {

    private static final Logger log = LoggerFactory.getLogger(EvaluationQueueSupervisor.class);

    private final EvaluationJobRepository evaluationJobRepository;

    public EvaluationQueueSupervisor(EvaluationJobRepository evaluationJobRepository) {
        this.evaluationJobRepository = evaluationJobRepository;
    }

    @Scheduled(fixedDelay = 15000)
    @Transactional
    public void recoverAbandonedJobs() {
        Instant now = Instant.now();
        List<EvaluationJob> expiredJobs = evaluationJobRepository.findExpiredLeaseJobs(now);

        for (EvaluationJob job : expiredJobs) {
            log.warn("Recuperando trabajo huérfano {} (lease expiró en {}). Reencolando...", job.getId(), job.getLeaseUntil());
            job.setStatus("QUEUED");
            job.setWorkerId(null);
            job.setLeaseUntil(null);
            evaluationJobRepository.save(job);
        }
    }
}

