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
import com.benigascode.learning.service.ContextService;
import com.benigascode.submissions.repository.StudentProgressRepository;
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
}

