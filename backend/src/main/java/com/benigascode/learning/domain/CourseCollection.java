package com.benigascode.learning.domain;

import com.benigascode.content.domain.Collection;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_collections")
public class CourseCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id", nullable = false)
    private Collection collection;

    @Column(name = "assigned_all_students", nullable = false)
    private boolean assignedAllStudents = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CourseCollection() {
    }

    public CourseCollection(Course course, Collection collection) {
        this(course, collection, true);
    }

    public CourseCollection(Course course, Collection collection, boolean assignedAllStudents) {
        this.course = course;
        this.collection = collection;
        this.assignedAllStudents = assignedAllStudents;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public Collection getCollection() {
        return collection;
    }

    public void setCollection(Collection collection) {
        this.collection = collection;
    }

    public boolean isAssignedAllStudents() {
        return assignedAllStudents;
    }

    public void setAssignedAllStudents(boolean assignedAllStudents) {
        this.assignedAllStudents = assignedAllStudents;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
