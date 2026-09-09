package com.benigascode.content.repository;

import com.benigascode.content.domain.AccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccessGrantRepository extends JpaRepository<AccessGrant, UUID> {
    Optional<AccessGrant> findByUserIdAndCollectionId(UUID userId, UUID collectionId);
    boolean existsByUserIdAndCollectionId(UUID userId, UUID collectionId);
}

