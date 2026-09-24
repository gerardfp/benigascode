package com.benigascode.identity.repository;

import com.benigascode.identity.domain.InvitationCode;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvitationCodeRepository extends JpaRepository<InvitationCode, UUID> {
    Optional<InvitationCode> findByCode(String code);

    @EntityGraph(attributePaths = {"tags", "createdBy"})
    Optional<InvitationCode> findWithTagsByCode(String code);

    @EntityGraph(attributePaths = {"tags", "createdBy"})
    Optional<InvitationCode> findWithTagsByCodeAndActiveTrue(String code);

    Optional<InvitationCode> findByCodeAndActiveTrue(String code);

    boolean existsByCode(String code);

    @EntityGraph(attributePaths = {"tags", "createdBy"})
    List<InvitationCode> findAllByOrderByCreatedAtDesc();
}
