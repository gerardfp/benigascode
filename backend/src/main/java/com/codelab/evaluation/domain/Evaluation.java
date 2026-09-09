package com.codelab.evaluation.domain;

import com.codelab.activities.domain.ActivityVersion;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.submissions.domain.Submission;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evaluations")
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_version_id", nullable = false)
    private ExerciseVersion exerciseVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_version_id", nullable = false)
    private ActivityVersion activityVersion;

    @Column(name = "runtime_id", nullable = false, length = 50)
    private String runtimeId;

    @Column(name = "runtime_image_digest", length = 100)
    private String runtimeImageDigest;

    @Column(name = "evaluator_version", nullable = false, length = 50)
    private String evaluatorVersion = "1.0.0";

    @Column(nullable = false, length = 30)
    private String status; // CORRECT, INCORRECT, COMPILE_ERROR, TIMEOUT, RUNTIME_ERROR, SYSTEM_ERROR, CANCELLED

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score = BigDecimal.ZERO;

    @Column(nullable = false, length = 50)
    private String reason = "INITIAL_SUBMISSION";

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Evaluation() {
    }

    public UUID getId() {
        return id;
    }

    public Submission getSubmission() {
        return submission;
    }

    public void setSubmission(Submission submission) {
        this.submission = submission;
    }

    public ExerciseVersion getExerciseVersion() {
        return exerciseVersion;
    }

    public void setExerciseVersion(ExerciseVersion exerciseVersion) {
        this.exerciseVersion = exerciseVersion;
    }

    public ActivityVersion getActivityVersion() {
        return activityVersion;
    }

    public void setActivityVersion(ActivityVersion activityVersion) {
        this.activityVersion = activityVersion;
    }

    public String getRuntimeId() {
        return runtimeId;
    }

    public void setRuntimeId(String runtimeId) {
        this.runtimeId = runtimeId;
    }

    public String getRuntimeImageDigest() {
        return runtimeImageDigest;
    }

    public void setRuntimeImageDigest(String runtimeImageDigest) {
        this.runtimeImageDigest = runtimeImageDigest;
    }

    public String getEvaluatorVersion() {
        return evaluatorVersion;
    }

    public void setEvaluatorVersion(String evaluatorVersion) {
        this.evaluatorVersion = evaluatorVersion;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

