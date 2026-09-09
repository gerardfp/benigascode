package com.codelab.content.repository;

import com.codelab.content.domain.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    Optional<Collection> findBySlug(String slug);

    @Query("SELECT c FROM Collection c WHERE c.visibility = 'PUBLIC' AND c.status = 'PUBLISHED'")
    List<Collection> findPublicCollections();

    @Query("SELECT c FROM Collection c JOIN AccessGrant ag ON ag.collection.id = c.id WHERE ag.user.id = :userId")
    List<Collection> findAccessibleCollectionsByUserId(UUID userId);
}

