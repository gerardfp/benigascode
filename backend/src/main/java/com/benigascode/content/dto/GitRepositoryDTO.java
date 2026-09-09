package com.benigascode.content.dto;

import com.benigascode.content.domain.GitRepository;
import java.time.Instant;
import java.util.UUID;

public record GitRepositoryDTO(
    UUID id,
    String name,
    String repositoryUrl,
    String branch,
    String rootPath,
    String authType,
    boolean hasToken,
    String publicKey,
    String lastCommit,
    Instant lastSyncAt,
    String lastSyncStatus,
    String lastSyncError,
    Instant createdAt
) {
    public static GitRepositoryDTO fromEntity(GitRepository entity) {
        if (entity == null) return null;
        return new GitRepositoryDTO(
            entity.getId(),
            entity.getName(),
            entity.getRepositoryUrl(),
            entity.getBranch(),
            entity.getRootPath(),
            entity.getAuthType(),
            entity.getAuthToken() != null && !entity.getAuthToken().isBlank(),
            entity.getPublicKey(),
            entity.getLastCommit(),
            entity.getLastSyncAt(),
            entity.getLastSyncStatus(),
            entity.getLastSyncError(),
            entity.getCreatedAt()
        );
    }
}
