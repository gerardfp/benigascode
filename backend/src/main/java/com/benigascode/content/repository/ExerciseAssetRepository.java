package com.benigascode.content.repository;

import com.benigascode.content.domain.ExerciseAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExerciseAssetRepository extends JpaRepository<ExerciseAsset, UUID> {

    Optional<ExerciseAsset> findByExerciseIdAndFilename(UUID exerciseId, String filename);

    List<ExerciseAsset> findByExerciseId(UUID exerciseId);

    void deleteByExerciseIdAndFilename(UUID exerciseId, String filename);
}

