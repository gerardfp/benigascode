package com.benigascode.activities.domain;

import com.benigascode.learning.domain.TeachingSpace;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teaching_space_id", nullable = false)
    private TeachingSpace teachingSpace;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 30)
    private String type; // PRACTICE, EXAM, ASSIGNMENT

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Activity() {
    }

    public Activity(TeachingSpace teachingSpace, String name, String type) {
        this.teachingSpace = teachingSpace;
        this.name = name;
        this.type = type;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public TeachingSpace getTeachingSpace() {
        return teachingSpace;
    }

    public void setTeachingSpace(TeachingSpace teachingSpace) {
        this.teachingSpace = teachingSpace;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
