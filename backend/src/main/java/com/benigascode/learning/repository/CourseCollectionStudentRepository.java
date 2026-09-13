package com.benigascode.learning.repository;

import com.benigascode.learning.domain.CourseCollectionStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseCollectionStudentRepository extends JpaRepository<CourseCollectionStudent, UUID> {

    List<CourseCollectionStudent> findByCourseCollectionId(UUID courseCollectionId);

    List<CourseCollectionStudent> findByStudentId(UUID studentId);

    Optional<CourseCollectionStudent> findByCourseCollectionIdAndStudentId(UUID courseCollectionId, UUID studentId);

    boolean existsByCourseCollectionIdAndStudentId(UUID courseCollectionId, UUID studentId);

    @Modifying
    @Query("DELETE FROM CourseCollectionStudent ccs WHERE ccs.courseCollection.id = :courseCollectionId")
    void deleteByCourseCollectionId(@Param("courseCollectionId") UUID courseCollectionId);

    @Modifying
    @Query("DELETE FROM CourseCollectionStudent ccs WHERE ccs.courseCollection.id = :courseCollectionId AND ccs.student.id = :studentId")
    void deleteByCourseCollectionIdAndStudentId(@Param("courseCollectionId") UUID courseCollectionId, @Param("studentId") UUID studentId);

    @Modifying
    @Query("DELETE FROM CourseCollectionStudent ccs WHERE ccs.courseCollection.course.id = :courseId AND ccs.student.id = :studentId")
    void deleteByCourseIdAndStudentId(@Param("courseId") UUID courseId, @Param("studentId") UUID studentId);
}

