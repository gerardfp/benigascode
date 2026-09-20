package com.benigascode.content.repository;

import com.benigascode.content.domain.ExerciseDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExerciseDraftRepository extends JpaRepository<ExerciseDraft, UUID> {

    Optional<ExerciseDraft> findByExerciseId(UUID exerciseId);

    @Modifying
    @Query("DELETE FROM ExerciseDraft ed WHERE ed.exercise.id = :exerciseId")
    void deleteByExerciseId(UUID exerciseId);

    boolean existsByExerciseId(UUID exerciseId);

    @Query("SELECT ed.exercise.id FROM ExerciseDraft ed")
    List<UUID> findAllExerciseIdsWithDraft();
}
