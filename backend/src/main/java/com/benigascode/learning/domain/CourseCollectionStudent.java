package com.benigascode.learning.domain;

import com.benigascode.identity.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_collection_students", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"course_collection_id", "student_id"})
})
public class CourseCollectionStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_collection_id", nullable = false)
    private CourseCollection courseCollection;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CourseCollectionStudent() {
    }

    public CourseCollectionStudent(CourseCollection courseCollection, User student) {
        this.courseCollection = courseCollection;
        this.student = student;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public CourseCollection getCourseCollection() {
        return courseCollection;
    }

    public void setCourseCollection(CourseCollection courseCollection) {
        this.courseCollection = courseCollection;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

