package com.benigascode.submissions.domain;

import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "attempt_ledger")
public class AttemptLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "activity_version_id", nullable = true)
    private ActivityVersion activityVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "exercise_version_id", nullable = true)
    private ExerciseVersion exerciseVersion;

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
        this.exerciseVersion = activityVersion != null ? activityVersion.getExerciseVersion() : null;
        this.attemptNumber = attemptNumber;
        this.submission = submission;
        this.status = "CONSUMED";
        this.createdAt = Instant.now();
    }

    public AttemptLedger(User student, ExerciseVersion exerciseVersion, int attemptNumber, Submission submission) {
        this.student = student;
        this.activityVersion = null;
        this.exerciseVersion = exerciseVersion;
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

    public ExerciseVersion getExerciseVersion() {
        return exerciseVersion;
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
