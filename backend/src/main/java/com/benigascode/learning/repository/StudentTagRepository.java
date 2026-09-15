package com.benigascode.learning.repository;

import com.benigascode.learning.domain.StudentTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentTagRepository extends JpaRepository<StudentTag, UUID> {

    List<StudentTag> findByStudentIdOrderByValidFromDesc(UUID studentId);

    @Query("SELECT st FROM StudentTag st JOIN FETCH st.tag WHERE st.student.id = :studentId AND (st.validUntil IS NULL OR st.validUntil > CURRENT_TIMESTAMP) AND st.validFrom <= CURRENT_TIMESTAMP")
    List<StudentTag> findActiveByStudentId(@Param("studentId") UUID studentId);

    default List<StudentTag> findActiveByStudentId(UUID studentId, Instant asOf) {
        if (asOf == null) return findActiveByStudentId(studentId);
        return findByStudentIdAsOf(studentId, asOf);
    }

    @Query("SELECT st FROM StudentTag st JOIN FETCH st.tag WHERE st.student.id IN :studentIds AND (st.validUntil IS NULL OR st.validUntil > CURRENT_TIMESTAMP) AND st.validFrom <= CURRENT_TIMESTAMP")
    List<StudentTag> findActiveByStudentIdIn(@Param("studentIds") Collection<UUID> studentIds);

    @Query("SELECT st FROM StudentTag st JOIN FETCH st.tag WHERE st.student.id = :studentId AND st.validFrom <= :asOf AND (st.validUntil IS NULL OR st.validUntil > :asOf)")
    List<StudentTag> findByStudentIdAsOf(@Param("studentId") UUID studentId, @Param("asOf") Instant asOf);

    @Query("SELECT st FROM StudentTag st JOIN FETCH st.tag WHERE st.student.id IN :studentIds AND st.validFrom <= :asOf AND (st.validUntil IS NULL OR st.validUntil > :asOf)")
    List<StudentTag> findByStudentIdInAsOf(@Param("studentIds") Collection<UUID> studentIds, @Param("asOf") Instant asOf);

    @Query("SELECT st FROM StudentTag st WHERE st.student.id = :studentId AND st.tag.id = :tagId AND (st.validUntil IS NULL OR st.validUntil > CURRENT_TIMESTAMP)")
    Optional<StudentTag> findActiveByStudentIdAndTagId(@Param("studentId") UUID studentId, @Param("tagId") UUID tagId);

    @Query("SELECT COUNT(st) > 0 FROM StudentTag st WHERE st.student.id = :studentId AND st.tag.id = :tagId AND (st.validUntil IS NULL OR st.validUntil > CURRENT_TIMESTAMP)")
    boolean existsActiveByStudentIdAndTagId(@Param("studentId") UUID studentId, @Param("tagId") UUID tagId);

    List<StudentTag> findByTagId(UUID tagId);
}

