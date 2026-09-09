package com.codelab.content.repository;

import com.codelab.content.domain.CollectionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionVersionRepository extends JpaRepository<CollectionVersion, UUID> {
    Optional<CollectionVersion> findByCollectionIdAndVersionNumber(UUID collectionId, int versionNumber);

    @Query("SELECT cv FROM CollectionVersion cv WHERE cv.collection.id = :collectionId ORDER BY cv.versionNumber DESC LIMIT 1")
    Optional<CollectionVersion> findLatestByCollectionId(UUID collectionId);
}

