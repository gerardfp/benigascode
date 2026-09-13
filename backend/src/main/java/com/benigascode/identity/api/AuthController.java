package com.benigascode.identity.api;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.dto.GitHubUserProfile;
import com.benigascode.content.service.GitHubOAuthService;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.*;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.identity.service.TeacherInvitationService;
import com.benigascode.identity.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final UserRepository userRepository;
    private final TeacherInvitationService invitationService;
    private final GitHubOAuthService gitHubOAuthService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserService userService,
                          UserRepository userRepository,
                          TeacherInvitationService invitationService,
                          GitHubOAuthService gitHubOAuthService) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.userRepository = userRepository;
        this.invitationService = invitationService;
        this.gitHubOAuthService = gitHubOAuthService;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<UserDTO> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        Authentication authReq = new UsernamePasswordAuthenticationToken(request.username(), request.password());
        Authentication authRes = authenticationManager.authenticate(authReq);

        SecurityContext sc = SecurityContextHolder.createEmptyContext();
        sc.setAuthentication(authRes);
        SecurityContextHolder.setContext(sc);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, sc);

        User user = userService.getCurrentUser();
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }

    // ==================== VALIDACIÓN DE INVITACIÓN ====================

    @PostMapping("/auth/invitation/validate")
    public ResponseEntity<ValidateInvitationResponse> validateInvitation(@Valid @RequestBody ValidateInvitationRequest request) {
        ValidateInvitationResponse response = invitationService.validateInvitation(request.code());
        return ResponseEntity.ok(response);
    }

    // ==================== GITHUB OAUTH PARA ALUMNOS / LOGIN ====================

    @GetMapping("/auth/github/url")
    public ResponseEntity<Map<String, Object>> getGitHubAuthUrl(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String redirectUri) {
        boolean configured = gitHubOAuthService.isConfigured();
        if (!configured) {
            return ResponseEntity.ok(Map.of(
                "configured", false,
                "url", ""
            ));
        }

        String url = gitHubOAuthService.buildStudentAuthorizeUrl(state, redirectUri);
        return ResponseEntity.ok(Map.of(
            "configured", true,
            "url", url
        ));
    }

    @PostMapping("/auth/github/authenticate")
    public ResponseEntity<UserDTO> authenticateWithGitHub(
            @Valid @RequestBody GitHubAuthRequest request,
            HttpServletRequest httpRequest) {

        if (!gitHubOAuthService.isConfigured()) {
            throw new ValidationException("GitHub OAuth no está configurado en el servidor");
        }

        // 1. Intercambiar código por access token
        Map<String, Object> tokenResult = gitHubOAuthService.exchangeCodeForToken(request.code(), request.redirectUri());
        String accessToken = (String) tokenResult.get("accessToken");
        if (accessToken == null || accessToken.isBlank()) {
            throw new ValidationException("No se pudo obtener el token de acceso de GitHub");
        }

        // 2. Obtener datos del perfil de GitHub
        GitHubUserProfile profile = gitHubOAuthService.fetchUserProfile(accessToken);

        // 3. Buscar si el usuario ya existe por githubId o por username/email
        Optional<User> userOpt = userRepository.findByGithubId(profile.id());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(profile.login());
        }
        if (userOpt.isEmpty() && profile.email() != null && !profile.email().isBlank()) {
            userOpt = userRepository.findByUsername(profile.email());
        }

        User user;
        if (userOpt.isPresent()) {
            // Usuario ya registrado -> Actualizar datos de GitHub si faltan e iniciar sesión
            user = userOpt.get();
            if (user.getGithubId() == null) {
                user.setGithubId(profile.id());
            }
            if (user.getGithubUsername() == null) {
                user.setGithubUsername(profile.login());
            }
            if (user.getAvatarUrl() == null && profile.avatarUrl() != null) {
                user.setAvatarUrl(profile.avatarUrl());
            }
            user = userRepository.save(user);
        } else {
            // Usuario NUEVO -> Debe proporcionar una clave de invitación válida
            if (request.invitationCode() == null || request.invitationCode().trim().isBlank()) {
                throw new ValidationException("Se requiere una clave de invitación válida para registrarse en la plataforma.");
            }

            ValidateInvitationResponse validation = invitationService.validateInvitation(request.invitationCode());
            if (!validation.valid()) {
                throw new ValidationException(validation.message() != null ? validation.message() : "Clave de invitación no válida o inactiva.");
            }

            // Generar username único
            String username = profile.login();
            if (userRepository.existsByUsername(username)) {
                username = profile.login() + "_" + profile.id().substring(0, Math.min(5, profile.id().length()));
            }

            user = new User(
                username,
                profile.name(),
                Role.STUDENT,
                profile.id(),
                profile.login(),
                profile.avatarUrl()
            );
            user = userRepository.save(user);
        }

        // 4. Crear sesión autenticada en Spring Security
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            user.getUsername(),
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );

        SecurityContext sc = SecurityContextHolder.createEmptyContext();
        sc.setAuthentication(auth);
        SecurityContextHolder.setContext(sc);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, sc);

        return ResponseEntity.ok(UserDTO.fromEntity(user));
    }
}


