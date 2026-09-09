package com.benigascode.activities.domain;

import com.benigascode.content.domain.ExerciseVersion;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_versions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"activity_id", "version_number"})
})
public class ActivityVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_version_id", nullable = false)
    private ExerciseVersion exerciseVersion;

    @Column(name = "max_attempts")
    private Integer maxAttempts; // null = ilimitados

    @Column(name = "available_from")
    private Instant availableFrom;

    @Column(name = "available_until")
    private Instant availableUntil;

    @Column(name = "due_at")
    private Instant dueAt;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "feedback_policy", columnDefinition = "JSONB")
    private String feedbackPolicy = "{\"level\": \"DETAILED\"}";

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "scoring_rules", columnDefinition = "JSONB")
    private String scoringRules = "{\"scale\": 100}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ActivityVersion() {
    }

    public boolean isAvailableNow() {
        Instant now = Instant.now();
        if (availableFrom != null && now.isBefore(availableFrom)) {
            return false;
        }
        if (availableUntil != null && now.isAfter(availableUntil)) {
            return false;
        }
        return true;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Activity getActivity() {
        return activity;
    }

    public void setActivity(Activity activity) {
        this.activity = activity;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public ExerciseVersion getExerciseVersion() {
        return exerciseVersion;
    }

    public void setExerciseVersion(ExerciseVersion exerciseVersion) {
        this.exerciseVersion = exerciseVersion;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Instant getAvailableFrom() {
        return availableFrom;
    }

    public void setAvailableFrom(Instant availableFrom) {
        this.availableFrom = availableFrom;
    }

    public Instant getAvailableUntil() {
        return availableUntil;
    }

    public void setAvailableUntil(Instant availableUntil) {
        this.availableUntil = availableUntil;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public String getFeedbackPolicy() {
        return feedbackPolicy;
    }

    public void setFeedbackPolicy(String feedbackPolicy) {
        this.feedbackPolicy = feedbackPolicy;
    }

    public String getScoringRules() {
        return scoringRules;
    }

    public void setScoringRules(String scoringRules) {
        this.scoringRules = scoringRules;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

