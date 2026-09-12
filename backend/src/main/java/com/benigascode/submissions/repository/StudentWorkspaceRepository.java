package com.benigascode.submissions.repository;

import com.benigascode.submissions.domain.StudentWorkspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentWorkspaceRepository extends JpaRepository<StudentWorkspace, UUID> {
    Optional<StudentWorkspace> findByStudentIdAndExerciseId(UUID studentId, UUID exerciseId);
}

