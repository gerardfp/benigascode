package com.benigascode.learning;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.dto.CreateTeachingSpaceRequest;
import com.benigascode.learning.dto.TeachingSpaceDTO;
import com.benigascode.learning.dto.UpdateTeachingSpaceRequest;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.learning.service.TeachingSpaceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeachingSpaceServiceTest {

    @Mock
    private TeachingSpaceRepository teachingSpaceRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private CollectionRepository collectionRepository;

    @Mock
    private CollectionVersionRepository collectionVersionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ContextService contextService;

    @InjectMocks
    private TeachingSpaceService teachingSpaceService;

    private User teacher;
    private TeachingSpace space;
    private UUID spaceId;
    private UUID tagId1;
    private UUID tagId2;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        spaceId = UUID.randomUUID();
        tagId1 = UUID.randomUUID();
        tagId2 = UUID.randomUUID();

        teacher = new User("teacher@test.local", "hash", "Teacher Test", Role.TEACHER);
        teacher.setId(UUID.randomUUID());

        space = new TeachingSpace("Espacio 1", "Desc", List.of(tagId1));
        space.setId(spaceId);
        space.getTeachers().add(teacher);
    }

    @Test
    void testJacksonDeserializationWithBothContextTagIdsAndRequiredTagIds() throws Exception {
        String json = """
            {
                "name": "Espacio Actualizado",
                "description": "Nueva descripcion",
                "contextTagIds": ["%s", "%s"],
                "requiredTagIds": ["%s", "%s"]
            }
            """.formatted(tagId1, tagId2, tagId1, tagId2);

        UpdateTeachingSpaceRequest req = objectMapper.readValue(json, UpdateTeachingSpaceRequest.class);
        assertNotNull(req);
        assertEquals("Espacio Actualizado", req.name());
        assertEquals(2, req.contextTagIds().size());
        assertTrue(req.contextTagIds().contains(tagId1));
        assertTrue(req.contextTagIds().contains(tagId2));
    }

    @Test
    void testJacksonDeserializationWithOnlyRequiredTagIds() throws Exception {
        String json = """
            {
                "name": "Espacio Con RequiredTagIds",
                "requiredTagIds": ["%s"]
            }
            """.formatted(tagId1);

        UpdateTeachingSpaceRequest req = objectMapper.readValue(json, UpdateTeachingSpaceRequest.class);
        assertNotNull(req);
        assertEquals("Espacio Con RequiredTagIds", req.name());
        assertNotNull(req.contextTagIds());
        assertEquals(1, req.contextTagIds().size());
        assertEquals(tagId1, req.contextTagIds().get(0));
    }

    @Test
    void testCreateTeachingSpaceRequestDeserializationWithBoth() throws Exception {
        String json = """
            {
                "name": "Nuevo Espacio",
                "contextTagIds": ["%s"],
                "requiredTagIds": ["%s"]
            }
            """.formatted(tagId1, tagId1);

        CreateTeachingSpaceRequest req = objectMapper.readValue(json, CreateTeachingSpaceRequest.class);
        assertNotNull(req);
        assertEquals("Nuevo Espacio", req.name());
        assertEquals(1, req.contextTagIds().size());
    }

    @Test
    void testUpdateSpaceSuccessfullyUpdatesTags() {
        when(teachingSpaceRepository.isTeacherOfSpace(spaceId, teacher.getId())).thenReturn(true);
        when(teachingSpaceRepository.findById(spaceId)).thenReturn(Optional.of(space));
        when(teachingSpaceRepository.save(any(TeachingSpace.class))).thenAnswer(inv -> inv.getArgument(0));

        Tag t1 = new Tag("cat", "val1", "desc", "#ffffff");
        t1.setId(tagId1);
        Tag t2 = new Tag("cat", "val2", "desc", "#ffffff");
        t2.setId(tagId2);
        when(tagRepository.findAllByIdIn(any())).thenReturn(List.of(t1, t2));
        when(contextService.countMatchingStudents(any())).thenReturn(5);

        UpdateTeachingSpaceRequest request = new UpdateTeachingSpaceRequest(
            "Espacio 1 Modificado",
            "Nueva desc",
            List.of(tagId1, tagId2),
            List.of(tagId1, tagId2)
        );

        TeachingSpaceDTO result = teachingSpaceService.updateSpace(spaceId, request, teacher);

        assertNotNull(result);
        assertEquals("Espacio 1 Modificado", result.name());
        assertEquals(2, result.contextTags().size());
        assertEquals(5, result.studentCount());
    }

    @Test
    void testUpdateSpaceDeniedIfNotTeacherOfSpace() {
        when(teachingSpaceRepository.isTeacherOfSpace(spaceId, teacher.getId())).thenReturn(false);

        UpdateTeachingSpaceRequest request = new UpdateTeachingSpaceRequest(
            "Espacio 1 Modificado",
            "Nueva desc",
            List.of(tagId1),
            List.of(tagId1)
        );

        assertThrows(AccessDeniedException.class, () ->
            teachingSpaceService.updateSpace(spaceId, request, teacher)
        );
    }
}
