package com.benigascode.submissions.domain;

import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
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

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "activity_version_id", nullable = true)
    private ActivityVersion activityVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_version_id", nullable = false)
    private ExerciseVersion exerciseVersion;

    @Column(name = "teaching_space_id")
    private UUID teachingSpaceId;

    @Column(name = "collection_id")
    private UUID collectionId;

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(name = "source_hash", length = 64)
    private String sourceHash;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(name = "delivery_channel", nullable = false, length = 30)
    private String deliveryChannel = "WEB"; // WEB, GITHUB

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber = 1;

    @Column(name = "runtime_id", nullable = false, length = 50)
    private String runtimeId = "java-26";

    @Column(name = "tests_hash", length = 64)
    private String testsHash;

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
        this.sourceHash = computeSha256(sourceCode);
        this.language = language;
        this.deliveryChannel = "WEB";
        this.runtimeId = "java-26";
        this.testsHash = exerciseVersion != null ? exerciseVersion.getContentHash() : null;
        this.status = "QUEUED";
        this.createdAt = Instant.now();
    }

    public static String computeSha256(String data) {
        if (data == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public ActivityVersion getActivityVersion() {
        return activityVersion;
    }

    public void setActivityVersion(ActivityVersion activityVersion) {
        this.activityVersion = activityVersion;
    }

    public ExerciseVersion getExerciseVersion() {
        return exerciseVersion;
    }

    public void setExerciseVersion(ExerciseVersion exerciseVersion) {
        this.exerciseVersion = exerciseVersion;
    }

    public UUID getTeachingSpaceId() {
        return teachingSpaceId;
    }

    public void setTeachingSpaceId(UUID teachingSpaceId) {
        this.teachingSpaceId = teachingSpaceId;
    }

    public UUID getCourseId() {
        return teachingSpaceId;
    }

    public void setCourseId(UUID courseId) {
        this.teachingSpaceId = courseId;
    }

    public UUID getCollectionId() {
        return collectionId;
    }

    public void setCollectionId(UUID collectionId) {
        this.collectionId = collectionId;
    }

    public String getSourceCode() {
        return sourceCode;
    }

    public void setSourceCode(String sourceCode) {
        this.sourceCode = sourceCode;
        this.sourceHash = computeSha256(sourceCode);
    }

    public String getSourceHash() {
        return sourceHash;
    }

    public void setSourceHash(String sourceHash) {
        this.sourceHash = sourceHash;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getDeliveryChannel() {
        return deliveryChannel;
    }

    public void setDeliveryChannel(String deliveryChannel) {
        this.deliveryChannel = deliveryChannel;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(int attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public String getRuntimeId() {
        return runtimeId;
    }

    public void setRuntimeId(String runtimeId) {
        this.runtimeId = runtimeId;
    }

    public String getTestsHash() {
        return testsHash;
    }

    public void setTestsHash(String testsHash) {
        this.testsHash = testsHash;
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
