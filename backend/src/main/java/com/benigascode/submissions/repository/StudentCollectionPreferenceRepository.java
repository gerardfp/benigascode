package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.StudentCollectionPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentCollectionPreferenceRepository extends JpaRepository<StudentCollectionPreference, UUID> {
    Optional<StudentCollectionPreference> findByStudentIdAndCollectionId(UUID studentId, UUID collectionId);
}

