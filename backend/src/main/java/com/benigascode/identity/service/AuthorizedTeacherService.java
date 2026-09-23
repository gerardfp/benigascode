package com.benigascode.identity.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.AuthorizedTeacher;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.AddAuthorizedTeacherRequest;
import com.benigascode.identity.dto.AuthorizedTeacherDTO;
import com.benigascode.identity.dto.BulkAddTeacherResponse;
import com.benigascode.identity.repository.AuthorizedTeacherRepository;
import com.benigascode.identity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthorizedTeacherService {

    private final AuthorizedTeacherRepository authorizedTeacherRepository;
    private final UserRepository userRepository;

    @Value("${benigascode.initial-teachers.github-usernames:gerardfp}")
    private String initialTeacherUsernamesConfig;

    public AuthorizedTeacherService(AuthorizedTeacherRepository authorizedTeacherRepository,
                                  UserRepository userRepository) {
        this.authorizedTeacherRepository = authorizedTeacherRepository;
        this.userRepository = userRepository;
    }

    private Set<String> getInitialUsernames() {
        if (initialTeacherUsernamesConfig == null || initialTeacherUsernamesConfig.isBlank()) {
            return Set.of("gerardfp");
        }
        return Arrays.stream(initialTeacherUsernamesConfig.split(","))
            .map(String::trim)
            .map(String::toLowerCase)
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public boolean isAuthorized(String githubUsername) {
        if (githubUsername == null || githubUsername.isBlank()) {
            return false;
        }
        String clean = githubUsername.trim().toLowerCase();
        if (getInitialUsernames().contains(clean)) {
            return true;
        }
        return authorizedTeacherRepository.existsByGithubUsernameIgnoreCase(clean);
    }

    @Transactional(readOnly = true)
    public List<AuthorizedTeacherDTO> listTeachers() {
        List<AuthorizedTeacher> entities = authorizedTeacherRepository.findAllByOrderByCreatedAtAsc();
        Set<String> initialSet = getInitialUsernames();

        // Obtener todos los usuarios profesores ya registrados para enriquecer datos
        List<User> teacherUsers = userRepository.findByRole(Role.TEACHER);
        Map<String, User> userByGithub = new HashMap<>();
        for (User u : teacherUsers) {
            if (u.getGithubUsername() != null) {
                userByGithub.put(u.getGithubUsername().trim().toLowerCase(), u);
            }
            if (u.getUsername() != null) {
                userByGithub.put(u.getUsername().trim().toLowerCase(), u);
            }
        }

        List<AuthorizedTeacherDTO> result = new ArrayList<>();
        Set<String> processedUsernames = new HashSet<>();

        for (AuthorizedTeacher at : entities) {
            String ghUser = at.getGithubUsername().toLowerCase();
            processedUsernames.add(ghUser);

            User u = userByGithub.get(ghUser);
            boolean registered = u != null;
            String fullName = u != null ? u.getFullName() : null;
            String avatarUrl = u != null ? u.getAvatarUrl() : null;
            boolean isPrimary = initialSet.contains(ghUser);
            String createdByName = at.getCreatedBy() != null ? at.getCreatedBy().getFullName() : "Sistema";

            result.add(new AuthorizedTeacherDTO(
                at.getId(),
                at.getGithubUsername(),
                at.getNotes(),
                at.getCreatedAt(),
                createdByName,
                registered,
                fullName,
                avatarUrl,
                isPrimary
            ));
        }

        // Si algún usuario inicial no estaba explícitamente en la base de datos, incluirlo
        for (String initUser : initialSet) {
            if (!processedUsernames.contains(initUser)) {
                User u = userByGithub.get(initUser);
                result.add(0, new AuthorizedTeacherDTO(
                    null,
                    initUser,
                    "Profesor inicial configurado en el sistema",
                    java.time.Instant.EPOCH,
                    "Configuración del Sistema",
                    u != null,
                    u != null ? u.getFullName() : null,
                    u != null ? u.getAvatarUrl() : null,
                    true
                ));
            }
        }

        return result;
    }

    @Transactional
    public AuthorizedTeacherDTO addAuthorizedTeacher(AddAuthorizedTeacherRequest request, User creator) {
        String clean = request.githubUsername().trim().toLowerCase();

        if (isAuthorized(clean)) {
            throw new ValidationException("El usuario de GitHub @" + clean + " ya está autorizado como profesor");
        }

        AuthorizedTeacher entity = new AuthorizedTeacher(clean, request.notes() != null ? request.notes().trim() : null, creator);
        entity = authorizedTeacherRepository.save(entity);

        // Si ya existía un usuario registrado con este login de GitHub (por ejemplo como alumno), promocionarlo a TEACHER
        Optional<User> existingUser = userRepository.findByUsername(clean);
        if (existingUser.isEmpty()) {
            existingUser = userRepository.findAll().stream()
                .filter(u -> clean.equalsIgnoreCase(u.getGithubUsername()))
                .findFirst();
        }

        boolean registered = false;
        String fullName = null;
        String avatarUrl = null;

        if (existingUser.isPresent()) {
            User u = existingUser.get();
            if (u.getRole() != Role.TEACHER && u.getRole() != Role.ADMIN) {
                u.setRole(Role.TEACHER);
                userRepository.save(u);
            }
            registered = true;
            fullName = u.getFullName();
            avatarUrl = u.getAvatarUrl();
        }

        return new AuthorizedTeacherDTO(
            entity.getId(),
            entity.getGithubUsername(),
            entity.getNotes(),
            entity.getCreatedAt(),
            creator != null ? creator.getFullName() : "Sistema",
            registered,
            fullName,
            avatarUrl,
            getInitialUsernames().contains(clean)
        );
    }

    @Transactional
    public BulkAddTeacherResponse addAuthorizedTeachersBulk(List<AddAuthorizedTeacherRequest> requests, User creator) {
        if (requests == null || requests.isEmpty()) {
            return new BulkAddTeacherResponse(Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
        }

        List<AuthorizedTeacherDTO> added = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            AddAuthorizedTeacherRequest req = requests.get(i);
            if (req == null) {
                continue;
            }

            String raw = req.githubUsername();
            if (raw == null || raw.trim().isBlank()) {
                errors.add("Fila " + (i + 1) + ": el nombre de usuario de GitHub es obligatorio");
                continue;
            }

            String clean = raw.trim().toLowerCase();
            if (clean.startsWith("@")) {
                clean = clean.substring(1).trim();
            }
            if (clean.isBlank()) {
                errors.add("Fila " + (i + 1) + ": el nombre de usuario de GitHub no es válido");
                continue;
            }

            if (isAuthorized(clean)) {
                skipped.add("@" + clean);
                continue;
            }

            try {
                AuthorizedTeacherDTO dto = addAuthorizedTeacher(new AddAuthorizedTeacherRequest(clean, req.notes()), creator);
                added.add(dto);
            } catch (Exception ex) {
                errors.add("@" + clean + ": " + ex.getMessage());
            }
        }

        return new BulkAddTeacherResponse(added, skipped, errors);
    }

    @Transactional
    public void removeAuthorizedTeacher(UUID id, User currentTeacher) {
        AuthorizedTeacher entity = authorizedTeacherRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Profesor autorizado no encontrado: " + id));

        String ghUser = entity.getGithubUsername().toLowerCase();

        if (getInitialUsernames().contains(ghUser)) {
            throw new ValidationException("No se puede revocar la autorización del profesor inicial del sistema");
        }

        if (currentTeacher != null && currentTeacher.getGithubUsername() != null
                && ghUser.equalsIgnoreCase(currentTeacher.getGithubUsername().trim())) {
            throw new ValidationException("No puedes eliminar tu propia autorización docente");
        }

        authorizedTeacherRepository.delete(entity);
    }
}

