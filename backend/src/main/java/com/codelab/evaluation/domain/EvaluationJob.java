package com.codelab.evaluation.domain;

import com.codelab.submissions.domain.Submission;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evaluation_jobs")
public class EvaluationJob {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private Submission submission;

    @Column(nullable = false, length = 30)
    private String status = "QUEUED"; // QUEUED, CLAIMED, FINISHED, FAILED, CANCELLED

    @Column(nullable = false)
    private int priority = 0;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "worker_id", length = 100)
    private String workerId;

    @Column(name = "lease_until")
    private Instant leaseUntil;

    @Column(name = "available_at", nullable = false)
    private Instant availableAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public EvaluationJob() {
    }

    public EvaluationJob(Submission submission) {
        this.submission = submission;
        this.status = "QUEUED";
        this.priority = 0;
        this.attempts = 0;
        this.availableAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Submission getSubmission() {
        return submission;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public String getWorkerId() {
        return workerId;
    }

    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }

    public Instant getLeaseUntil() {
        return leaseUntil;
    }

    public void setLeaseUntil(Instant leaseUntil) {
        this.leaseUntil = leaseUntil;
    }

    public Instant getAvailableAt() {
        return availableAt;
    }

    public void setAvailableAt(Instant availableAt) {
        this.availableAt = availableAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

