package com.benigascode.identity.repository;

import com.benigascode.identity.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByGithubId(String githubId);
    boolean existsByUsername(String username);
    boolean existsByGithubId(String githubId);
    java.util.List<User> findByRole(com.benigascode.identity.domain.Role role);
    java.util.List<User> findByRoleOrderByFullNameAsc(com.benigascode.identity.domain.Role role);
}

