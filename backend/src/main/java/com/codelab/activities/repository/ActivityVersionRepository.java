package com.codelab.activities.repository;

import com.codelab.activities.domain.ActivityVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActivityVersionRepository extends JpaRepository<ActivityVersion, UUID> {
    @Query("SELECT av FROM ActivityVersion av WHERE av.activity.id = :activityId ORDER BY av.versionNumber DESC LIMIT 1")
    Optional<ActivityVersion> findLatestByActivityId(UUID activityId);

    Optional<ActivityVersion> findByActivityIdAndVersionNumber(UUID activityId, int versionNumber);
}

