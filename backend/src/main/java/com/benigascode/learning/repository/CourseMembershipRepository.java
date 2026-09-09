package com.benigascode.learning.repository;

import com.benigascode.learning.domain.CourseMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseMembershipRepository extends JpaRepository<CourseMembership, UUID> {
    Optional<CourseMembership> findByUserIdAndCourseId(UUID userId, UUID courseId);
    List<CourseMembership> findByCourseId(UUID courseId);
    List<CourseMembership> findByUserId(UUID userId);
    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByUserIdAndCourseIdAndRole(UUID userId, UUID courseId, String role);
}

