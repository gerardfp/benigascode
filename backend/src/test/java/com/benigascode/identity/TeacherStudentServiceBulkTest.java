package com.benigascode.identity;

import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.BulkCreateStudentItem;
import com.benigascode.identity.dto.BulkCreateStudentResponse;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.identity.service.TeacherStudentService;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.learning.service.TagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherStudentServiceBulkTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private TeachingSpaceRepository teachingSpaceRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private StudentTagRepository studentTagRepository;
    @Mock
    private ContextService contextService;
    @Mock
    private TagService tagService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private TeacherStudentService studentService;

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "encoded_" + inv.getArgument(0));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
    }

    @Test
    void createStudentsBulk_GeneratesUsernameAndPasswordWhenOmitted() {
        when(userRepository.existsByUsername("mlopez")).thenReturn(false);

        BulkCreateStudentItem item1 = new BulkCreateStudentItem("María López", null, null);
        BulkCreateStudentResponse response = studentService.createStudentsBulk(List.of(item1));

        assertEquals(1, response.created().size());
        assertEquals(0, response.errors().size());

        BulkCreateStudentResponse.CreatedStudentItem created = response.created().get(0);
        assertEquals("María López", created.fullName());
        assertEquals("mlopez", created.username());
        assertTrue(created.generatedUsername());
        assertTrue(created.generatedPassword());
        assertNotNull(created.password());
        assertEquals(10, created.password().length());
    }

    @Test
    void createStudentsBulk_HandlesCollisionsInGeneratedUsernames() {
        when(userRepository.existsByUsername("mlopez")).thenReturn(true);
        when(userRepository.existsByUsername("mlopez1")).thenReturn(false);

        BulkCreateStudentItem item = new BulkCreateStudentItem("María López", "", "");
        BulkCreateStudentResponse response = studentService.createStudentsBulk(List.of(item));

        assertEquals(1, response.created().size());
        assertEquals("mlopez1", response.created().get(0).username());
    }

    @Test
    void createStudentsBulk_UsesProvidedCredentials() {
        when(userRepository.existsByUsername("carloss@centro.edu")).thenReturn(false);

        BulkCreateStudentItem item = new BulkCreateStudentItem("Carlos Sanz", "carloss@centro.edu", "mySecretPass123");
        BulkCreateStudentResponse response = studentService.createStudentsBulk(List.of(item));

        assertEquals(1, response.created().size());
        BulkCreateStudentResponse.CreatedStudentItem created = response.created().get(0);
        assertEquals("carloss@centro.edu", created.username());
        assertEquals("mySecretPass123", created.password());
        assertFalse(created.generatedUsername());
        assertFalse(created.generatedPassword());
    }

    @Test
    void createStudentsBulk_ReportsErrorsForBlankNameOrExistingUsername() {
        when(userRepository.existsByUsername("existingUser")).thenReturn(true);

        BulkCreateStudentItem emptyName = new BulkCreateStudentItem("", "u1", "p1");
        BulkCreateStudentItem duplicate = new BulkCreateStudentItem("Ana Ruiz", "existingUser", "p2");

        BulkCreateStudentResponse response = studentService.createStudentsBulk(List.of(emptyName, duplicate));

        assertEquals(0, response.created().size());
        assertEquals(2, response.errors().size());
        assertTrue(response.errors().get(0).contains("nombre completo es obligatorio"));
        assertTrue(response.errors().get(1).contains("ya está registrado"));
    }
}

