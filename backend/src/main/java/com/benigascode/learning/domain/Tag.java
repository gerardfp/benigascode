package com.benigascode.learning.domain;

import com.benigascode.learning.util.TagColorUtil;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "tags", uniqueConstraints = {
    @UniqueConstraint(name = "uk_tags_category_value", columnNames = {"category", "value"})
})
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 100)
    private String value;

    @Column(length = 255)
    private String description;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Tag() {
    }

    public Tag(String category, String value, String description) {
        this(category, value, description, null);
    }

    public Tag(String category, String value, String description, String color) {
        this.category = category;
        this.value = value;
        this.description = description;
        this.color = TagColorUtil.sanitizeColor(color, category, value);
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getEffectiveColor() {
        return (color != null && !color.isBlank()) ? color : TagColorUtil.getDeterministicColor(category, value);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getFormatted() {
        return category + ":" + value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Tag tag = (Tag) o;
        return Objects.equals(category, tag.category) && Objects.equals(value, tag.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(category, value);
    }
}

