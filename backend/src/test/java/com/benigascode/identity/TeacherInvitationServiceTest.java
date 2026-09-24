package com.benigascode.identity;

import com.benigascode.identity.domain.InvitationCode;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.CreateInvitationRequest;
import com.benigascode.identity.dto.InvitationCodeDTO;
import com.benigascode.identity.repository.InvitationCodeRepository;
import com.benigascode.identity.service.TeacherInvitationService;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.service.TagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherInvitationServiceTest {

    @Mock
    private InvitationCodeRepository invitationRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private TagService tagService;

    @InjectMocks
    private TeacherInvitationService invitationService;

    private User teacher;
    private User student;
    private Tag tag1;
    private Tag tag2;

    @BeforeEach
    void setUp() {
        teacher = new User("teacher1", "Profesor Uno", Role.TEACHER, "gh_1", "teacher1", "https://avatar.url");
        teacher.setId(UUID.randomUUID());

        student = new User("student1", "Alumno Uno", Role.STUDENT, "gh_2", "student1", "https://avatar.url");
        student.setId(UUID.randomUUID());

        tag1 = new Tag("group", "DAM2", "Segundo DAM", "#3b82f6");
        tag1.setId(UUID.randomUUID());

        tag2 = new Tag("course", "2026", "Curso 2026", "#10b981");
        tag2.setId(UUID.randomUUID());
    }

    @Test
    void testCreateInvitationWithTags() {
        List<UUID> tagIds = List.of(tag1.getId(), tag2.getId());
        CreateInvitationRequest request = new CreateInvitationRequest("INV-123", "Invitación DAM", true, tagIds);

        when(invitationRepository.existsByCode("INV-123")).thenReturn(false);
        when(tagRepository.findAllById(tagIds)).thenReturn(List.of(tag1, tag2));
        when(invitationRepository.save(any(InvitationCode.class))).thenAnswer(inv -> {
            InvitationCode code = inv.getArgument(0);
            code.setId(UUID.randomUUID());
            return code;
        });

        InvitationCodeDTO result = invitationService.createInvitation(request, teacher);

        assertNotNull(result);
        assertEquals("INV-123", result.code());
        assertEquals("Invitación DAM", result.description());
        assertTrue(result.active());
        assertEquals(2, result.tags().size());
        verify(invitationRepository).save(any(InvitationCode.class));
    }

    @Test
    void testApplyInvitationTags() {
        InvitationCode ic = new InvitationCode("VALID-CODE", "Desc", true, teacher);
        ic.setId(UUID.randomUUID());
        ic.setTags(Set.of(tag1, tag2));

        when(invitationRepository.findWithTagsByCodeAndActiveTrue("VALID-CODE")).thenReturn(Optional.of(ic));

        invitationService.applyInvitationTags("VALID-CODE", student);

        verify(tagService).assignTag(eq(student.getId()), eq(tag1.getId()), eq(teacher), any(), isNull());
        verify(tagService).assignTag(eq(student.getId()), eq(tag2.getId()), eq(teacher), any(), isNull());
    }

    @Test
    void testApplyInvitationTagsWhenCodeInvalidOrInactive() {
        when(invitationRepository.findWithTagsByCodeAndActiveTrue("INACTIVE")).thenReturn(Optional.empty());

        invitationService.applyInvitationTags("INACTIVE", student);

        verifyNoInteractions(tagService);
    }
}

