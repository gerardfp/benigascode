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
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseDraft;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.dto.ExerciseDraftDTO;
import com.benigascode.content.dto.SaveExerciseRequest;
import com.benigascode.content.dto.TeacherExerciseDetailDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
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
    private ExerciseDraftRepository exerciseDraftRepository;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

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

    @Test
    void createExercise_WithMultipleTemplates_PrunesBlankAndSetsMultiLanguage() throws Exception {
        SaveExerciseRequest req = new SaveExerciseRequest(
                "multi-slug",
                "Multi Title",
                "Statement",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Map.of("java", "public class Main {}", "python", "print(1)", "c", "   "),
                List.of("tag1"),
                List.of(),
                List.of()
        );

        when(exerciseRepository.findBySlug("multi-slug")).thenReturn(Optional.empty());
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(inv -> {
            Exercise e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(exerciseRepository.findById(any())).thenAnswer(inv -> Optional.of(new Exercise("multi-slug")));
        when(exerciseVersionRepository.findLatestByExerciseId(any())).thenReturn(Optional.of(new ExerciseVersion()));
        when(exerciseAssetRepository.findByExerciseId(any())).thenReturn(List.of());

        ArgumentCaptor<ExerciseVersion> versionCaptor = ArgumentCaptor.forClass(ExerciseVersion.class);

        contentService.createExercise(req, teacher);

        verify(exerciseVersionRepository).save(versionCaptor.capture());
        ExerciseVersion saved = versionCaptor.getValue();

        assertEquals("multi", saved.getLanguage());
        assertEquals("multi", saved.getRuntimeId());

        @SuppressWarnings("unchecked")
        Map<String, String> parsedTemplates = objectMapper.readValue(saved.getTemplatesConfig(), Map.class);
        assertEquals(2, parsedTemplates.size());
        assertEquals("public class Main {}", parsedTemplates.get("java"));
        assertEquals("print(1)", parsedTemplates.get("python"));
        assertFalse(parsedTemplates.containsKey("c"));
    }

    @Test
    void createExercise_WithOnlyPythonTemplate_InfersPythonLanguageAndRuntime() throws Exception {
        SaveExerciseRequest req = new SaveExerciseRequest(
                "python-slug",
                "Python Title",
                "Statement",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Map.of("python", "def solution(): pass"),
                null,
                List.of(),
                List.of()
        );

        when(exerciseRepository.findBySlug("python-slug")).thenReturn(Optional.empty());
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(inv -> {
            Exercise e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(exerciseRepository.findById(any())).thenAnswer(inv -> Optional.of(new Exercise("python-slug")));
        when(exerciseVersionRepository.findLatestByExerciseId(any())).thenReturn(Optional.of(new ExerciseVersion()));
        when(exerciseAssetRepository.findByExerciseId(any())).thenReturn(List.of());

        ArgumentCaptor<ExerciseVersion> versionCaptor = ArgumentCaptor.forClass(ExerciseVersion.class);

        contentService.createExercise(req, teacher);

        verify(exerciseVersionRepository).save(versionCaptor.capture());
        ExerciseVersion saved = versionCaptor.getValue();

        assertEquals("python", saved.getLanguage());
        assertEquals("python-314", saved.getRuntimeId());

        @SuppressWarnings("unchecked")
        Map<String, String> parsedTemplates = objectMapper.readValue(saved.getTemplatesConfig(), Map.class);
        assertEquals(1, parsedTemplates.size());
        assertEquals("def solution(): pass", parsedTemplates.get("python"));
    }

    @Test
    void createExercise_WithOnlyJavaTemplate_InfersJavaLanguageAndRuntime() throws Exception {
        SaveExerciseRequest req = new SaveExerciseRequest(
                "java-slug",
                "Java Title",
                "Statement",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Map.of("java", "class Solution {}"),
                null,
                List.of(),
                List.of()
        );

        when(exerciseRepository.findBySlug("java-slug")).thenReturn(Optional.empty());
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(inv -> {
            Exercise e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(exerciseRepository.findById(any())).thenAnswer(inv -> Optional.of(new Exercise("java-slug")));
        when(exerciseVersionRepository.findLatestByExerciseId(any())).thenReturn(Optional.of(new ExerciseVersion()));
        when(exerciseAssetRepository.findByExerciseId(any())).thenReturn(List.of());

        ArgumentCaptor<ExerciseVersion> versionCaptor = ArgumentCaptor.forClass(ExerciseVersion.class);

        contentService.createExercise(req, teacher);

        verify(exerciseVersionRepository).save(versionCaptor.capture());
        ExerciseVersion saved = versionCaptor.getValue();

        assertEquals("java", saved.getLanguage());
        assertEquals("java-26", saved.getRuntimeId());

        @SuppressWarnings("unchecked")
        Map<String, String> parsedTemplates = objectMapper.readValue(saved.getTemplatesConfig(), Map.class);
        assertEquals(1, parsedTemplates.size());
        assertEquals("class Solution {}", parsedTemplates.get("java"));
    }

    @Test
    void saveExerciseDraft_CreatesOrUpdatesDraft() {
        UUID exId = UUID.randomUUID();
        Exercise exercise = new Exercise("draft-slug");
        exercise.setId(exId);

        when(exerciseRepository.findById(exId)).thenReturn(Optional.of(exercise));
        when(exerciseDraftRepository.findByExerciseId(exId)).thenReturn(Optional.empty());
        when(exerciseDraftRepository.save(any(ExerciseDraft.class))).thenAnswer(inv -> {
            ExerciseDraft ed = inv.getArgument(0);
            ed.setId(UUID.randomUUID());
            return ed;
        });

        ExerciseDraftDTO result = contentService.saveExerciseDraft(exId, "# Draft Title\nContenido borrador", teacher);

        assertNotNull(result);
        assertEquals(exId, result.exerciseId());
        assertEquals("# Draft Title\nContenido borrador", result.markdown());
        verify(exerciseDraftRepository).save(any(ExerciseDraft.class));
    }

    @Test
    void deleteExerciseDraft_DeletesDraft() {
        UUID exId = UUID.randomUUID();
        Exercise exercise = new Exercise("draft-slug");
        exercise.setId(exId);

        when(exerciseRepository.findById(exId)).thenReturn(Optional.of(exercise));

        contentService.deleteExerciseDraft(exId, teacher);

        verify(exerciseDraftRepository).deleteByExerciseId(exId);
    }

    @Test
    void getTeacherExerciseDetail_WithDraft_ReturnsDraftInfo() {
        UUID exId = UUID.randomUUID();
        Exercise exercise = new Exercise("test-slug");
        exercise.setId(exId);

        ExerciseVersion version = new ExerciseVersion();
        version.setExercise(exercise);
        version.setTitle("Published Title");
        version.setStatement("Published Statement");
        version.setLanguage("java");
        version.setRuntimeId("java-26");
        version.setVersionNumber(1);

        ExerciseDraft draft = new ExerciseDraft(exercise, "# Draft Title\nDraft Statement", teacher);

        when(exerciseRepository.findById(exId)).thenReturn(Optional.of(exercise));
        when(exerciseVersionRepository.findLatestByExerciseId(exId)).thenReturn(Optional.of(version));
        when(exerciseAssetRepository.findByExerciseId(exId)).thenReturn(List.of());
        when(exerciseDraftRepository.findByExerciseId(exId)).thenReturn(Optional.of(draft));

        TeacherExerciseDetailDTO detail = contentService.getTeacherExerciseDetail(exId);

        assertNotNull(detail);
        assertTrue(detail.hasDraft());
        assertEquals("# Draft Title\nDraft Statement", detail.draftMarkdown());
        assertNotNull(detail.draftUpdatedAt());
    }

    @Test
    void updateExercise_DeletesDraftOnPublish() {
        UUID exId = UUID.randomUUID();
        Exercise exercise = new Exercise("test-slug");
        exercise.setId(exId);

        ExerciseVersion existingVersion = new ExerciseVersion();
        existingVersion.setExercise(exercise);
        existingVersion.setVersionNumber(1);
        existingVersion.setTitle("Old Title");
        existingVersion.setStatement("Old Statement");
        existingVersion.setLanguage("java");
        existingVersion.setRuntimeId("java-26");

        SaveExerciseRequest req = new SaveExerciseRequest(
                "test-slug",
                "New Title",
                "New Statement",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Map.of("java", "class Solution {}"),
                List.of(),
                List.of(),
                List.of()
        );

        when(exerciseRepository.findById(exId)).thenReturn(Optional.of(exercise));
        when(exerciseVersionRepository.findLatestByExerciseId(exId)).thenReturn(Optional.of(existingVersion));
        when(exerciseAssetRepository.findByExerciseId(exId)).thenReturn(List.of());
        when(exerciseDraftRepository.findByExerciseId(exId)).thenReturn(Optional.empty());

        contentService.updateExercise(exId, req, teacher);

        verify(exerciseDraftRepository).deleteByExerciseId(exId);
        verify(exerciseVersionRepository).save(any(ExerciseVersion.class));
    }
}

