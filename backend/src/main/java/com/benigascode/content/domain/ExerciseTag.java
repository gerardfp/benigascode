package com.benigascode.content.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "exercise_tags")
public class ExerciseTag {

    @Id
    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ExerciseTag() {
    }

    public ExerciseTag(String name, String color) {
        this.name = name;
        this.color = color;
        this.createdAt = Instant.now();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
