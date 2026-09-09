package com.codelab.submissions.domain;

import com.codelab.activities.domain.ActivityVersion;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_version_id", nullable = false)
    private ActivityVersion activityVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_version_id", nullable = false)
    private ExerciseVersion exerciseVersion;

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(name = "delivery_channel", nullable = false, length = 30)
    private String deliveryChannel = "WEB"; // WEB, GITHUB

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, QUEUED, EVALUATING, FINISHED, CANCELLED

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Submission() {
    }

    public Submission(User student, ActivityVersion activityVersion, ExerciseVersion exerciseVersion, String sourceCode, String language) {
        this.student = student;
        this.activityVersion = activityVersion;
        this.exerciseVersion = exerciseVersion;
        this.sourceCode = sourceCode;
        this.language = language;
        this.deliveryChannel = "WEB";
        this.status = "QUEUED";
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

    public String getSourceCode() {
        return sourceCode;
    }

    public String getLanguage() {
        return language;
    }

    public String getDeliveryChannel() {
        return deliveryChannel;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

