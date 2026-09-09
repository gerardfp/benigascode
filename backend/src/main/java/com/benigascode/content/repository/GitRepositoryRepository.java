package com.benigascode.content.repository;

import com.benigascode.content.domain.GitRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GitRepositoryRepository extends JpaRepository<GitRepository, UUID> {
    List<GitRepository> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById);
    Optional<GitRepository> findTopByCreatedByIdOrderByCreatedAtDesc(UUID createdById);
    Optional<GitRepository> findByRepositoryUrl(String repositoryUrl);
}
