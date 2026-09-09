package com.codelab.content.domain;

import com.codelab.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "access_grants", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "collection_id"})
})
public class AccessGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collection_id", nullable = false)
    private Collection collection;

    @Column(nullable = false, length = 30)
    private String mechanism; // KEY, ASSIGNED, PUBLIC

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AccessGrant() {
    }

    public AccessGrant(User user, Collection collection, String mechanism) {
        this.user = user;
        this.collection = collection;
        this.mechanism = mechanism;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Collection getCollection() {
        return collection;
    }

    public String getMechanism() {
        return mechanism;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

