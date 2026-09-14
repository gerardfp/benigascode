package com.benigascode.identity.repository;

import com.benigascode.identity.domain.AuthorizedTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthorizedTeacherRepository extends JpaRepository<AuthorizedTeacher, UUID> {

    Optional<AuthorizedTeacher> findByGithubUsernameIgnoreCase(String githubUsername);

    boolean existsByGithubUsernameIgnoreCase(String githubUsername);

    List<AuthorizedTeacher> findAllByOrderByCreatedAtAsc();

    void deleteByGithubUsernameIgnoreCase(String githubUsername);
}

