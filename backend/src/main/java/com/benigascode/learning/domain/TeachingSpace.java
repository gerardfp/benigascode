package com.benigascode.learning.domain;

import com.benigascode.content.domain.Collection;
import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "teaching_spaces")
public class TeachingSpace {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "context_config", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> contextConfig = new HashMap<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "teaching_space_teachers",
        joinColumns = @JoinColumn(name = "teaching_space_id"),
        inverseJoinColumns = @JoinColumn(name = "teacher_id")
    )
    private Set<User> teachers = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "teaching_space_collections",
        joinColumns = @JoinColumn(name = "teaching_space_id"),
        inverseJoinColumns = @JoinColumn(name = "collection_id")
    )
    private Set<Collection> collections = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TeachingSpace() {
        this.contextConfig = new HashMap<>();
        this.contextConfig.put("tagIds", new ArrayList<String>());
    }

    public TeachingSpace(String name) {
        this(name, null, List.of());
    }

    public TeachingSpace(String name, String description) {
        this(name, description, List.of());
    }

    public TeachingSpace(String name, String description, List<UUID> tagIds) {
        this.name = name;
        this.description = description;
        this.contextConfig = new HashMap<>();
        List<String> ids = tagIds != null ? tagIds.stream().map(UUID::toString).toList() : new ArrayList<>();
        this.contextConfig.put("tagIds", ids);
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @SuppressWarnings("unchecked")
    public List<UUID> getRequiredTagIds() {
        if (contextConfig == null || !contextConfig.containsKey("tagIds")) {
            return Collections.emptyList();
        }
        Object list = contextConfig.get("tagIds");
        if (list instanceof List<?> l) {
            List<UUID> result = new ArrayList<>();
            for (Object item : l) {
                if (item instanceof String s && !s.isBlank()) {
                    try {
                        result.add(UUID.fromString(s));
                    } catch (IllegalArgumentException ignored) {
                    }
                }
            }
            return result;
        }
        return Collections.emptyList();
    }

    public void setRequiredTagIds(List<UUID> tagIds) {
        if (this.contextConfig == null) {
            this.contextConfig = new HashMap<>();
        }
        List<String> ids = tagIds != null ? tagIds.stream().map(UUID::toString).toList() : new ArrayList<>();
        this.contextConfig.put("tagIds", ids);
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, Object> getContextConfig() {
        return contextConfig;
    }

    public void setContextConfig(Map<String, Object> contextConfig) {
        this.contextConfig = contextConfig != null ? contextConfig : new HashMap<>();
        this.updatedAt = Instant.now();
    }

    public Set<User> getTeachers() {
        return teachers;
    }

    public void setTeachers(Set<User> teachers) {
        this.teachers = teachers != null ? teachers : new HashSet<>();
    }

    public Set<Collection> getCollections() {
        return collections;
    }

    public void setCollections(Set<Collection> collections) {
        this.collections = collections != null ? collections : new HashSet<>();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

