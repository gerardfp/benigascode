package com.benigascode.learning;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.dto.UpdateTagRequest;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.TagService;
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
class TagServiceTest {

    @Mock
    private TagRepository tagRepository;
    @Mock
    private StudentTagRepository studentTagRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TeachingSpaceRepository teachingSpaceRepository;

    @InjectMocks
    private TagService tagService;

    private Tag tag1;
    private Tag tag2;

    @BeforeEach
    void setUp() {
        tag1 = new Tag("level", "1DAM", "Primer curso", "#19c888");
        tag2 = new Tag("level", "1º DAM", "Primer curso oficial", "#1924c8");
    }

    @Test
    void testUpdateTagRenamingSuccess() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findById(id)).thenReturn(Optional.of(tag1));
        when(tagRepository.existsByCategoryAndValue("level", "1-DAM")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateTagRequest request = new UpdateTagRequest("level", "1-DAM", "Nuevo", "#c81919");
        var result = tagService.updateTag(id, request);

        assertEquals("1-DAM", result.value());
        assertEquals("Nuevo", result.description());
        assertEquals("#c81919", result.color());
    }

    @Test
    void testUpdateTagCollisionThrowsValidation() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findById(id)).thenReturn(Optional.of(tag1));
        when(tagRepository.existsByCategoryAndValue("level", "1º DAM")).thenReturn(true);

        UpdateTagRequest request = new UpdateTagRequest("level", "1º DAM", null, null);
        assertThrows(ValidationException.class, () -> tagService.updateTag(id, request));
    }

    @Test
    void testMergeTagsSuccess() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        when(tagRepository.findById(id1)).thenReturn(Optional.of(tag1));
        when(tagRepository.findById(id2)).thenReturn(Optional.of(tag2));

        User student = new User("std1", "pass", "Student 1", Role.STUDENT);
        StudentTag st = new StudentTag(student, tag1, java.time.Instant.now(), null, null);
        when(studentTagRepository.findByTagId(id1)).thenReturn(List.of(st));
        when(studentTagRepository.findActiveByStudentIdAndTagId(student.getId(), id2)).thenReturn(Optional.empty());

        TeachingSpace space = new TeachingSpace("DAM Space", "Desc", List.of(id1));
        when(teachingSpaceRepository.findAll()).thenReturn(List.of(space));

        tagService.mergeTags(id1, id2);

        assertEquals(tag2, st.getTag());
        assertTrue(space.getRequiredTagIds().contains(id2));
        assertFalse(space.getRequiredTagIds().contains(id1));
        verify(tagRepository).delete(tag1);
    }

    @Test
    void testCleanUnusedTags() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        tag1 = spy(tag1);
        tag2 = spy(tag2);
        when(tag1.getId()).thenReturn(id1);
        when(tag2.getId()).thenReturn(id2);

        when(tagRepository.findAll()).thenReturn(List.of(tag1, tag2));
        when(studentTagRepository.findDistinctTagIds()).thenReturn(List.of(id1));
        when(teachingSpaceRepository.findAll()).thenReturn(List.of());

        int cleaned = tagService.cleanUnusedTags();

        assertEquals(1, cleaned);
        verify(tagRepository).delete(tag2);
        verify(tagRepository, never()).delete(tag1);
    }
}
