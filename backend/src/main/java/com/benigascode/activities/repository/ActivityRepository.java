package com.benigascode.activities.repository;

import com.benigascode.activities.domain.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    List<Activity> findByTeachingSpaceId(UUID teachingSpaceId);

    List<Activity> findByTeachingSpaceIdIn(Collection<UUID> teachingSpaceIds);
}
