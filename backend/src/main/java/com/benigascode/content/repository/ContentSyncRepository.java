package com.benigascode.content.repository;

import com.benigascode.content.domain.ContentSync;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContentSyncRepository extends JpaRepository<ContentSync, UUID> {
    List<ContentSync> findTop10ByOrderByStartedAtDesc();
}

