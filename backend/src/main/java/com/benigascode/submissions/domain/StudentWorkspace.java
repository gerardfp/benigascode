package com.benigascode.submissions.domain;

import com.benigascode.content.domain.Exercise;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_workspaces", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "exercise_id"})
})
public class StudentWorkspace {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StudentWorkspace() {
    }

    public StudentWorkspace(User student, Exercise exercise, String sourceCode) {
        this.student = student;
        this.exercise = exercise;
        this.sourceCode = sourceCode;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public String getSourceCode() {
        return sourceCode;
    }

    public void setSourceCode(String sourceCode) {
        this.sourceCode = sourceCode;
        this.updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

