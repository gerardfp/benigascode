package com.benigascode.identity;

import com.benigascode.identity.domain.AuthorizedTeacher;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.AddAuthorizedTeacherRequest;
import com.benigascode.identity.dto.BulkAddTeacherResponse;
import com.benigascode.identity.repository.AuthorizedTeacherRepository;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.identity.service.AuthorizedTeacherService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizedTeacherServiceBulkTest {

    @Mock
    private AuthorizedTeacherRepository authorizedTeacherRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthorizedTeacherService authorizedTeacherService;

    @BeforeEach
    void setUp() {
        lenient().when(authorizedTeacherRepository.save(any(AuthorizedTeacher.class))).thenAnswer(inv -> {
            AuthorizedTeacher at = inv.getArgument(0);
            return at;
        });
        lenient().when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        lenient().when(userRepository.findAll()).thenReturn(Collections.emptyList());
    }

    @Test
    void addAuthorizedTeachersBulk_AddsAndSkipsProperly() {
        when(authorizedTeacherRepository.existsByGithubUsernameIgnoreCase("octocat")).thenReturn(false);

        User creator = new User("admin", "pass", "Admin User", com.benigascode.identity.domain.Role.ADMIN);

        List<AddAuthorizedTeacherRequest> requests = List.of(
                new AddAuthorizedTeacherRequest("octocat", "Profesor de DAM"),
                new AddAuthorizedTeacherRequest("@gerardfp", "Profesor inicial"),
                new AddAuthorizedTeacherRequest("   ", "Notas vacías")
        );

        BulkAddTeacherResponse response = authorizedTeacherService.addAuthorizedTeachersBulk(requests, creator);

        assertEquals(1, response.added().size());
        assertEquals("octocat", response.added().get(0).githubUsername());
        assertEquals("Profesor de DAM", response.added().get(0).notes());

        assertEquals(1, response.skipped().size());
        assertEquals("@gerardfp", response.skipped().get(0));

        assertEquals(1, response.errors().size());
        assertTrue(response.errors().get(0).contains("obligatorio"));
    }
}
