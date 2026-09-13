package com.benigascode.identity.repository;

import com.benigascode.identity.domain.StudentTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentTagRepository extends JpaRepository<StudentTag, UUID> {
    List<StudentTag> findByStudentId(UUID studentId);
    List<StudentTag> findByStudentIdIn(Collection<UUID> studentIds);
    Optional<StudentTag> findByStudentIdAndTag(UUID studentId, String tag);
    boolean existsByStudentIdAndTag(UUID studentId, String tag);
    void deleteByStudentIdAndTag(UUID studentId, String tag);

    @Query("SELECT DISTINCT st.tag FROM StudentTag st ORDER BY st.tag")
    List<String> findAllDistinctTags();
}

