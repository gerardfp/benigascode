package com.benigascode.content.repository;

import com.benigascode.content.domain.AccessKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccessKeyRepository extends JpaRepository<AccessKey, UUID> {
    Optional<AccessKey> findByKeyHash(String keyHash);
}

