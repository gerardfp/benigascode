package com.benigascode.content.repository;

import com.benigascode.content.domain.ExerciseTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExerciseTagRepository extends JpaRepository<ExerciseTag, String> {
    Optional<ExerciseTag> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
