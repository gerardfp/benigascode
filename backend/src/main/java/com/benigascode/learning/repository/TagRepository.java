package com.benigascode.learning.repository;

import com.benigascode.learning.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {

    List<Tag> findAllByOrderByCategoryAscValueAsc();

    List<Tag> findByCategoryOrderByValueAsc(String category);

    Optional<Tag> findByCategoryAndValue(String category, String value);

    boolean existsByCategoryAndValue(String category, String value);

    List<Tag> findAllByIdIn(Collection<UUID> ids);

    @Query("SELECT DISTINCT t.category FROM Tag t ORDER BY t.category")
    List<String> findAllDistinctCategories();
}

