package com.benigascode.submissions.domain;

import com.benigascode.content.domain.Collection;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_collection_preferences", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "collection_id"})
})
public class StudentCollectionPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collection_id", nullable = false)
    private Collection collection;

    @Column(name = "last_used_language", nullable = false, length = 30)
    private String lastUsedLanguage = "java";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StudentCollectionPreference() {
    }

    public StudentCollectionPreference(User student, Collection collection, String lastUsedLanguage) {
        this.student = student;
        this.collection = collection;
        this.lastUsedLanguage = lastUsedLanguage != null ? lastUsedLanguage.toLowerCase() : "java";
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public Collection getCollection() {
        return collection;
    }

    public void setCollection(Collection collection) {
        this.collection = collection;
    }

    public String getLastUsedLanguage() {
        return lastUsedLanguage;
    }

    public void setLastUsedLanguage(String lastUsedLanguage) {
        this.lastUsedLanguage = lastUsedLanguage != null ? lastUsedLanguage.toLowerCase() : "java";
        this.updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

