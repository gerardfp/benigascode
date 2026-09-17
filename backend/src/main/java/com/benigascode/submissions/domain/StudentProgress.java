package com.benigascode.submissions.domain;

import com.benigascode.activities.domain.Activity;
import com.benigascode.content.domain.Exercise;
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_progress")
public class StudentProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "activity_id", nullable = true)
    private Activity activity;

    @Column(nullable = false, length = 30)
    private String status = "NOT_STARTED"; // NOT_STARTED, IN_PROGRESS, ATTEMPTED, PASSED, MASTERED

    @Column(name = "best_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal bestScore = BigDecimal.ZERO;

    @Column(name = "total_submissions", nullable = false)
    private int totalSubmissions = 0;

    @Column(name = "consumed_attempts", nullable = false)
    private int consumedAttempts = 0;

    @Column(name = "tests_passed", nullable = false)
    private int testsPassed = 0;

    @Column(name = "total_tests", nullable = false)
    private int totalTests = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_submission_id")
    private Submission lastSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_evaluation_id")
    private Evaluation lastEvaluation;

    @Column(name = "last_status", length = 30)
    private String lastStatus;

    @Column(name = "last_language", length = 30)
    private String lastLanguage;

    @Column(name = "first_submission_at")
    private Instant firstSubmissionAt;

    @Column(name = "first_solved_at")
    private Instant firstSolvedAt;

    @Column(name = "first_collection_id")
    private UUID firstCollectionId;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StudentProgress() {
    }

    public StudentProgress(User student, Exercise exercise) {
        this.student = student;
        this.exercise = exercise;
        this.activity = null;
        this.status = "NOT_STARTED";
        this.bestScore = BigDecimal.ZERO;
        this.totalSubmissions = 0;
        this.consumedAttempts = 0;
        this.testsPassed = 0;
        this.totalTests = 0;
        this.updatedAt = Instant.now();
    }

    public StudentProgress(User student, Exercise exercise, Activity activity) {
        this(student, exercise);
        this.activity = activity;
    }

    public boolean isSolved() {
        return "MASTERED".equalsIgnoreCase(status)
                || "PASSED".equalsIgnoreCase(status)
                || (bestScore != null && bestScore.compareTo(new BigDecimal("100")) >= 0);
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

    public Exercise getExercise() {
        return exercise;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public Activity getActivity() {
        return activity;
    }

    public void setActivity(Activity activity) {
        this.activity = activity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getBestScore() {
        return bestScore;
    }

    public void setBestScore(BigDecimal bestScore) {
        this.bestScore = bestScore;
    }

    public int getTotalSubmissions() {
        return totalSubmissions;
    }

    public void setTotalSubmissions(int totalSubmissions) {
        this.totalSubmissions = totalSubmissions;
    }

    public int getConsumedAttempts() {
        return consumedAttempts;
    }

    public void setConsumedAttempts(int consumedAttempts) {
        this.consumedAttempts = consumedAttempts;
    }

    public int getTestsPassed() {
        return testsPassed;
    }

    public void setTestsPassed(int testsPassed) {
        this.testsPassed = testsPassed;
    }

    public int getTotalTests() {
        return totalTests;
    }

    public void setTotalTests(int totalTests) {
        this.totalTests = totalTests;
    }

    public Submission getLastSubmission() {
        return lastSubmission;
    }

    public void setLastSubmission(Submission lastSubmission) {
        this.lastSubmission = lastSubmission;
    }

    public Evaluation getLastEvaluation() {
        return lastEvaluation;
    }

    public void setLastEvaluation(Evaluation lastEvaluation) {
        this.lastEvaluation = lastEvaluation;
    }

    public String getLastStatus() {
        return lastStatus;
    }

    public void setLastStatus(String lastStatus) {
        this.lastStatus = lastStatus;
    }

    public Instant getFirstSubmissionAt() {
        return firstSubmissionAt;
    }

    public void setFirstSubmissionAt(Instant firstSubmissionAt) {
        this.firstSubmissionAt = firstSubmissionAt;
    }

    public Instant getFirstSolvedAt() {
        return firstSolvedAt;
    }

    public void setFirstSolvedAt(Instant firstSolvedAt) {
        this.firstSolvedAt = firstSolvedAt;
    }

    public UUID getFirstCollectionId() {
        return firstCollectionId;
    }

    public void setFirstCollectionId(UUID firstCollectionId) {
        this.firstCollectionId = firstCollectionId;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getLastLanguage() {
        return lastLanguage;
    }

    public void setLastLanguage(String lastLanguage) {
        this.lastLanguage = lastLanguage != null ? lastLanguage.toLowerCase() : null;
    }
}
