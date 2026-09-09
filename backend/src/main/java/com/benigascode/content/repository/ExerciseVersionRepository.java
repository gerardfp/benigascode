package com.benigascode.content.repository;

import com.benigascode.content.domain.ExerciseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExerciseVersionRepository extends JpaRepository<ExerciseVersion, UUID> {
    Optional<ExerciseVersion> findByExerciseIdAndVersionNumber(UUID exerciseId, int versionNumber);

    @Query("SELECT ev FROM ExerciseVersion ev WHERE ev.exercise.id = :exerciseId ORDER BY ev.versionNumber DESC LIMIT 1")
    Optional<ExerciseVersion> findLatestByExerciseId(UUID exerciseId);

    List<ExerciseVersion> findByExerciseIdOrderByVersionNumberDesc(UUID exerciseId);
}

