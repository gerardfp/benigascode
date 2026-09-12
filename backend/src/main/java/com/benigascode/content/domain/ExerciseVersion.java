package com.benigascode.content.domain;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exercise_versions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"exercise_id", "version_number"})
})
public class ExerciseVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String statement;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(name = "runtime_id", nullable = false, length = 50)
    private String runtimeId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "compile_config", columnDefinition = "JSONB")
    private String compileConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "run_config", columnDefinition = "JSONB")
    private String runConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scoring_config", columnDefinition = "JSONB")
    private String scoringConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "comparator_config", columnDefinition = "JSONB")
    private String comparatorConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tests_config", columnDefinition = "JSONB")
    private String testsConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "templates_config", columnDefinition = "JSONB")
    private String templatesConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "JSONB")
    private String tags = "[]";

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "git_commit", length = 40)
    private String gitCommit;

    @Column(nullable = false, length = 30)
    private String status = "PUBLISHED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ExerciseVersion() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStatement() {
        return statement;
    }

    public void setStatement(String statement) {
        this.statement = statement;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getRuntimeId() {
        return runtimeId;
    }

    public void setRuntimeId(String runtimeId) {
        this.runtimeId = runtimeId;
    }

    public String getCompileConfig() {
        return compileConfig;
    }

    public void setCompileConfig(String compileConfig) {
        this.compileConfig = compileConfig;
    }

    public String getRunConfig() {
        return runConfig;
    }

    public void setRunConfig(String runConfig) {
        this.runConfig = runConfig;
    }

    public String getScoringConfig() {
        return scoringConfig;
    }

    public void setScoringConfig(String scoringConfig) {
        this.scoringConfig = scoringConfig;
    }

    public String getComparatorConfig() {
        return comparatorConfig;
    }

    public void setComparatorConfig(String comparatorConfig) {
        this.comparatorConfig = comparatorConfig;
    }

    public String getTestsConfig() {
        return testsConfig;
    }

    public void setTestsConfig(String testsConfig) {
        this.testsConfig = testsConfig;
    }

    public String getTemplatesConfig() {
        return templatesConfig;
    }

    public void setTemplatesConfig(String templatesConfig) {
        this.templatesConfig = templatesConfig;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getContentHash() {
        return contentHash;
    }

    public void setContentHash(String contentHash) {
        this.contentHash = contentHash;
    }

    public String getGitCommit() {
        return gitCommit;
    }

    public void setGitCommit(String gitCommit) {
        this.gitCommit = gitCommit;
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

