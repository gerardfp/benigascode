package com.benigascode.content;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.AccessKey;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.repository.*;
import com.benigascode.content.service.ContentService;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.submissions.repository.StudentProgressRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private CollectionRepository collectionRepository;
    @Mock
    private CollectionVersionRepository collectionVersionRepository;
    @Mock
    private ExerciseRepository exerciseRepository;
    @Mock
    private ExerciseVersionRepository exerciseVersionRepository;
    @Mock
    private AccessKeyRepository accessKeyRepository;
    @Mock
    private AccessGrantRepository accessGrantRepository;
    @Mock
    private ContextService contextService;
    @Mock
    private StudentProgressRepository studentProgressRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private TeachingSpaceRepository teachingSpaceRepository;
    @Mock
    private ExerciseAssetRepository exerciseAssetRepository;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ContentService contentService;

    private User student;
    private User teacher;
    private Collection collection;

    @BeforeEach
    void setUp() {
        student = new User("student@benigascode.local", "pass", "Student", Role.STUDENT);
        student.setId(UUID.randomUUID());

        teacher = new User("teacher@benigascode.local", "pass", "Teacher", Role.TEACHER);
        teacher.setId(UUID.randomUUID());

        collection = new Collection("java-basics", "PRIVATE");
        collection.setId(UUID.randomUUID());
    }

    @Test
    void claimAccessWithKey_ValidKey_Success() {
        String rawKey = "ABC-72F-X9";
        String hash = ContentService.sha256(rawKey);

        AccessKey key = new AccessKey(collection, hash, teacher, 10, Instant.now().plus(1, ChronoUnit.DAYS));
        when(accessKeyRepository.findByKeyHash(hash)).thenReturn(Optional.of(key));
        when(accessGrantRepository.existsByUserIdAndCollectionId(student.getId(), collection.getId())).thenReturn(false);

        CollectionVersion version = new CollectionVersion();
        version.setCollection(collection);
        version.setVersionNumber(1);
        version.setTitle("Java Basics v1");
        when(collectionVersionRepository.findLatestByCollectionId(collection.getId())).thenReturn(Optional.of(version));

        CollectionDTO result = contentService.claimAccessWithKey(rawKey, student);

        assertNotNull(result);
        assertEquals("java-basics", result.slug());
        assertEquals(1, key.getCurrentUses());
        verify(accessGrantRepository).save(any());
    }

    @Test
    void claimAccessWithKey_RevokedKey_ThrowsValidationException() {
        String rawKey = "REV-OKED-01";
        String hash = ContentService.sha256(rawKey);

        AccessKey key = new AccessKey(collection, hash, teacher, 10, Instant.now().plus(1, ChronoUnit.DAYS));
        key.revoke();
        when(accessKeyRepository.findByKeyHash(hash)).thenReturn(Optional.of(key));

        assertThrows(ValidationException.class, () ->
            contentService.claimAccessWithKey(rawKey, student)
        );
    }

    @Test
    void assertCanAccessCollection_PrivateWithoutGrant_ThrowsAccessDenied() {
        when(contextService.findSpacesForStudent(student)).thenReturn(List.of());
        when(accessGrantRepository.existsByUserIdAndCollectionId(student.getId(), collection.getId())).thenReturn(false);

        assertThrows(AccessDeniedException.class, () ->
            contentService.assertCanAccessCollection(student, collection)
        );
    }

    @Test
    void assertCanAccessCollection_Teacher_Allowed() {
        assertDoesNotThrow(() ->
            contentService.assertCanAccessCollection(teacher, collection)
        );
    }

    @Test
    void getPublicCollections_ReturnsPublicCollections() {
        Collection publicCol = new Collection("public-col", "PUBLIC");
        publicCol.setId(UUID.randomUUID());
        when(collectionRepository.findPublicCollections()).thenReturn(List.of(publicCol));
        when(collectionVersionRepository.findLatestByCollectionId(publicCol.getId())).thenReturn(Optional.empty());

        List<CollectionDTO> res = contentService.getPublicCollections(student);
        assertEquals(1, res.size());
        assertEquals("public-col", res.get(0).slug());
    }

    @Test
    void getMyCollections_IncludesParticipatedAndSpaceCollections() {
        TeachingSpace space = new TeachingSpace("DAM Space", "Desc", List.of());
        Collection spaceCol = new Collection("space-col", "PRIVATE");
        spaceCol.setId(UUID.randomUUID());
        space.getCollections().add(spaceCol);

        when(contextService.findSpacesForStudent(student)).thenReturn(List.of(space));

        UUID partColId = UUID.randomUUID();
        Collection partCol = new Collection("part-col", "PUBLIC");
        partCol.setId(partColId);

        when(submissionRepository.findParticipatedCollectionIdsByStudentId(student.getId())).thenReturn(List.of(partColId));
        when(collectionRepository.findAllById(List.of(partColId))).thenReturn(List.of(partCol));
        when(submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())).thenReturn(List.of());
        when(collectionRepository.findAccessibleCollectionsByUserId(student.getId())).thenReturn(List.of());

        when(collectionVersionRepository.findLatestByCollectionId(any())).thenReturn(Optional.empty());

        List<CollectionDTO> res = contentService.getMyCollections(student);
        assertEquals(2, res.size());
        List<String> slugs = res.stream().map(CollectionDTO::slug).toList();
        assertTrue(slugs.contains("space-col"));
        assertTrue(slugs.contains("part-col"));
    }
}

