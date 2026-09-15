package com.benigascode.learning.repository;

import com.benigascode.learning.domain.TeachingSpace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TeachingSpaceRepository extends JpaRepository<TeachingSpace, UUID> {

    List<TeachingSpace> findAllByOrderByNameAsc();

    @Query("SELECT ts FROM TeachingSpace ts JOIN ts.teachers t WHERE t.id = :teacherId ORDER BY ts.name ASC")
    List<TeachingSpace> findByTeacherId(@Param("teacherId") UUID teacherId);

    @Query("SELECT COUNT(t) > 0 FROM TeachingSpace ts JOIN ts.teachers t WHERE ts.id = :spaceId AND t.id = :teacherId")
    boolean isTeacherOfSpace(@Param("spaceId") UUID spaceId, @Param("teacherId") UUID teacherId);

    @Query("SELECT ts FROM TeachingSpace ts JOIN ts.collections c WHERE c.id = :collectionId")
    List<TeachingSpace> findByCollectionId(@Param("collectionId") UUID collectionId);
}

