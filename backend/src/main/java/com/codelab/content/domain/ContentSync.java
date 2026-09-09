package com.codelab.content.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_syncs")
public class ContentSync {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "git_commit", length = 40)
    private String gitCommit;

    @Column(nullable = false, length = 30)
    private String status; // RUNNING, SUCCESS, FAILED

    @Column(columnDefinition = "JSONB")
    private String errors = "[]";

    @Column(name = "created_versions", columnDefinition = "JSONB")
    private String createdVersions = "[]";

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "finished_at")
    private Instant finishedAt;

    public ContentSync() {
    }

    public ContentSync(String gitCommit) {
        this.gitCommit = gitCommit;
        this.status = "RUNNING";
        this.startedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getGitCommit() {
        return gitCommit;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getErrors() {
        return errors;
    }

    public void setErrors(String errors) {
        this.errors = errors;
    }

    public String getCreatedVersions() {
        return createdVersions;
    }

    public void setCreatedVersions(String createdVersions) {
        this.createdVersions = createdVersions;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void finish(String status, String errors, String createdVersions) {
        this.status = status;
        this.errors = errors;
        this.createdVersions = createdVersions;
        this.finishedAt = Instant.now();
    }
}

