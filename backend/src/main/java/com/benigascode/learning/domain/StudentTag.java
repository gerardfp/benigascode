package com.benigascode.learning.domain;

import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_tags")
public class StudentTag {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom = Instant.now();

    @Column(name = "valid_until")
    private Instant validUntil;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public StudentTag() {
    }

    public StudentTag(User student, Tag tag, Instant validFrom, Instant validUntil, User createdBy) {
        this.student = student;
        this.tag = tag;
        this.validFrom = validFrom != null ? validFrom : Instant.now();
        this.validUntil = validUntil;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public boolean isActive() {
        Instant now = Instant.now();
        return (validUntil == null || validUntil.isAfter(now)) && !validFrom.isAfter(now);
    }

    public boolean isActiveAt(Instant timestamp) {
        if (timestamp == null) return isActive();
        return !validFrom.isAfter(timestamp) && (validUntil == null || validUntil.isAfter(timestamp));
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

    public Tag getTag() {
        return tag;
    }

    public void setTag(Tag tag) {
        this.tag = tag;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }

    public Instant getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(Instant validUntil) {
        this.validUntil = validUntil;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

