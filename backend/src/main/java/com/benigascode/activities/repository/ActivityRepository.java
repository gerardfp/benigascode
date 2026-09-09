package com.benigascode.activities.repository;

import com.benigascode.activities.domain.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findByCourseId(UUID courseId);

    @Query("SELECT a FROM Activity a JOIN CourseMembership m ON m.course.id = a.course.id WHERE m.user.id = :userId")
    List<Activity> findActivitiesByUserId(UUID userId);
}

