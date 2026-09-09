package com.benigascode.identity;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.identity.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User("test@benigascode.local", "encodedPass", "Test User", Role.STUDENT);
        testUser.setId(UUID.randomUUID());
    }

    @Test
    void createUser_Success() {
        when(userRepository.existsByUsername("new@benigascode.local")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encodedSecret");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        UserDTO result = userService.createUser("new@benigascode.local", "secret123", "Test User", Role.STUDENT);

        assertNotNull(result);
        assertEquals(testUser.getUsername(), result.username());
        verify(passwordEncoder).encode("secret123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_DuplicateUsername_ThrowsValidationException() {
        when(userRepository.existsByUsername("duplicate@benigascode.local")).thenReturn(true);

        assertThrows(ValidationException.class, () ->
            userService.createUser("duplicate@benigascode.local", "secret123", "Test User", Role.STUDENT)
        );

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getById_Found() {
        UUID id = testUser.getId();
        when(userRepository.findById(id)).thenReturn(Optional.of(testUser));

        User user = userService.getById(id);
        assertEquals(id, user.getId());
    }
}

