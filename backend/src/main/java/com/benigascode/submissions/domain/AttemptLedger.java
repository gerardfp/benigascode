package com.benigascode.submissions.domain;

import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "attempt_ledger", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "activity_version_id", "attempt_number"})
})
public class AttemptLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_version_id", nullable = false)
    private ActivityVersion activityVersion;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(nullable = false, length = 30)
    private String status = "RESERVED"; // RESERVED, CONSUMED, REFUNDED

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AttemptLedger() {
    }

    public AttemptLedger(User student, ActivityVersion activityVersion, int attemptNumber, Submission submission) {
        this.student = student;
        this.activityVersion = activityVersion;
        this.attemptNumber = attemptNumber;
        this.submission = submission;
        this.status = "CONSUMED";
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public ActivityVersion getActivityVersion() {
        return activityVersion;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Submission getSubmission() {
        return submission;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

