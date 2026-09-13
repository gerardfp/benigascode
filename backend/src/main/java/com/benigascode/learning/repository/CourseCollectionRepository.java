package com.benigascode.learning.repository;

import com.benigascode.content.domain.Collection;
import com.benigascode.learning.domain.CourseCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseCollectionRepository extends JpaRepository<CourseCollection, UUID> {
    List<CourseCollection> findByCourseId(UUID courseId);
    List<CourseCollection> findByCollectionId(UUID collectionId);
    Optional<CourseCollection> findByCourseIdAndCollectionId(UUID courseId, UUID collectionId);
    boolean existsByCourseIdAndCollectionId(UUID courseId, UUID collectionId);
    void deleteByCourseIdAndCollectionId(UUID courseId, UUID collectionId);

    @Query("SELECT DISTINCT cc.collection FROM CourseCollection cc JOIN CourseMembership cm ON cc.course.id = cm.course.id WHERE cm.user.id = :studentId AND cm.role = 'STUDENT'")
    List<Collection> findCollectionsByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT CASE WHEN COUNT(cc) > 0 THEN true ELSE false END FROM CourseCollection cc JOIN CourseMembership cm ON cc.course.id = cm.course.id WHERE cm.user.id = :studentId AND cm.role = 'STUDENT' AND cc.collection.id = :collectionId")
    boolean isCollectionAssignedToStudent(@Param("studentId") UUID studentId, @Param("collectionId") UUID collectionId);
}

