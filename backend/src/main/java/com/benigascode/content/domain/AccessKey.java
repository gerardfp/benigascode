package com.benigascode.content.domain;

import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "access_keys")
public class AccessKey {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collection_id", nullable = false)
    private Collection collection;

    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "current_uses", nullable = false)
    private int currentUses = 0;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AccessKey() {
    }

    public AccessKey(Collection collection, String keyHash, User createdBy, Integer maxUses, Instant expiresAt) {
        this.collection = collection;
        this.keyHash = keyHash;
        this.createdBy = createdBy;
        this.maxUses = maxUses;
        this.currentUses = 0;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public boolean isValid() {
        if (revokedAt != null) return false;
        if (expiresAt != null && Instant.now().isAfter(expiresAt)) return false;
        if (maxUses != null && currentUses >= maxUses) return false;
        return true;
    }

    public UUID getId() {
        return id;
    }

    public Collection getCollection() {
        return collection;
    }

    public String getKeyHash() {
        return keyHash;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public Integer getMaxUses() {
        return maxUses;
    }

    public int getCurrentUses() {
        return currentUses;
    }

    public void incrementUses() {
        this.currentUses++;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

