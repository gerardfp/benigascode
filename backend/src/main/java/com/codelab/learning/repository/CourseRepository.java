package com.codelab.learning.repository;

import com.codelab.learning.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    Optional<Course> findByCode(String code);

    @Query("SELECT m.course FROM CourseMembership m WHERE m.user.id = :userId")
    List<Course> findCoursesByUserId(UUID userId);
}

