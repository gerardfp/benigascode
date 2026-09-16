package com.benigascode.learning.service;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.dto.CreateTeachingSpaceRequest;
import com.benigascode.learning.dto.TagDTO;
import com.benigascode.learning.dto.TeachingSpaceDTO;
import com.benigascode.learning.dto.UpdateTeachingSpaceRequest;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TeachingSpaceService {

    private final TeachingSpaceRepository teachingSpaceRepository;
    private final TagRepository tagRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final UserRepository userRepository;
    private final ContextService contextService;

    public TeachingSpaceService(TeachingSpaceRepository teachingSpaceRepository,
                                TagRepository tagRepository,
                                CollectionRepository collectionRepository,
                                CollectionVersionRepository collectionVersionRepository,
                                UserRepository userRepository,
                                ContextService contextService) {
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.tagRepository = tagRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.userRepository = userRepository;
        this.contextService = contextService;
    }

    @Transactional(readOnly = true)
    public List<TeachingSpaceDTO> getSpacesForUser(User user) {
        if (user.getRole() == Role.ADMIN) {
            return teachingSpaceRepository.findAllByOrderByNameAsc().stream()
                .map(this::toDTO)
                .toList();
        } else if (user.getRole() == Role.TEACHER) {
            return teachingSpaceRepository.findByTeacherId(user.getId()).stream()
                .map(this::toDTO)
                .toList();
        } else {
            // ALUMNO: devolver los espacios a los que pertenece dinámicamente según su contexto
            return contextService.findSpacesForStudent(user).stream()
                .map(this::toDTO)
                .toList();
        }
    }

    @Transactional(readOnly = true)
    public TeachingSpaceDTO getSpaceById(UUID spaceId, User user) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        if (user.getRole() == Role.STUDENT) {
            boolean matches = contextService.studentMatchesContext(user.getId(), space.getRequiredTagIds());
            if (!matches) {
                throw new AccessDeniedException("No perteneces a este espacio docente");
            }
        } else if (user.getRole() == Role.TEACHER) {
            assertTeacherOrAdmin(user, spaceId);
        }

        return toDTO(space);
    }

    @Transactional
    public TeachingSpaceDTO createSpace(CreateTeachingSpaceRequest request, User teacher) {
        if (teacher.getRole() != Role.TEACHER && teacher.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Solo los profesores o administradores pueden crear espacios docentes");
        }

        List<UUID> tagIds = request.contextTagIds() != null ? request.contextTagIds() : Collections.emptyList();
        TeachingSpace space = new TeachingSpace(request.name().trim(), request.description(), tagIds);

        // Asociar al creador si es profesor
        if (teacher.getRole() == Role.TEACHER) {
            space.getTeachers().add(teacher);
        }

        // Asociar profesores adicionales
        if (request.teacherIds() != null && !request.teacherIds().isEmpty()) {
            List<User> additionalTeachers = userRepository.findAllById(request.teacherIds());
            for (User t : additionalTeachers) {
                if (t.getRole() == Role.TEACHER || t.getRole() == Role.ADMIN) {
                    space.getTeachers().add(t);
                }
            }
        }

        // Asociar colecciones
        if (request.collectionIds() != null && !request.collectionIds().isEmpty()) {
            List<Collection> collections = collectionRepository.findAllById(request.collectionIds());
            space.getCollections().addAll(collections);
        }

        space = teachingSpaceRepository.save(space);
        return toDTO(space);
    }

    @Transactional
    public TeachingSpaceDTO updateSpace(UUID spaceId, UpdateTeachingSpaceRequest request, User teacher) {
        assertTeacherOrAdmin(teacher, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        space.setName(request.name().trim());
        space.setDescription(request.description());
        if (request.contextTagIds() != null) {
            space.setRequiredTagIds(request.contextTagIds());
        }

        space = teachingSpaceRepository.save(space);
        return toDTO(space);
    }

    @Transactional
    public void deleteSpace(UUID spaceId, User teacher) {
        assertTeacherOrAdmin(teacher, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        teachingSpaceRepository.delete(space);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getStudentsInSpace(UUID spaceId, User user) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        if (user.getRole() == Role.TEACHER) {
            assertTeacherOrAdmin(user, spaceId);
        }

        List<User> students = contextService.findMatchingStudents(space.getRequiredTagIds());
        return students.stream().map(UserDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getTeachersInSpace(UUID spaceId) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        return space.getTeachers().stream().map(UserDTO::fromEntity).toList();
    }

    @Transactional
    public void addTeacherToSpace(UUID spaceId, UUID teacherId, User currentUser) {
        assertTeacherOrAdmin(currentUser, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new ResourceNotFoundException("Profesor no encontrado: " + teacherId));

        if (teacher.getRole() != Role.TEACHER && teacher.getRole() != Role.ADMIN) {
            throw new ValidationException("El usuario seleccionado no es un profesor");
        }

        space.getTeachers().add(teacher);
        teachingSpaceRepository.save(space);
    }

    @Transactional
    public void removeTeacherFromSpace(UUID spaceId, UUID teacherId, User currentUser) {
        assertTeacherOrAdmin(currentUser, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        space.getTeachers().removeIf(t -> t.getId().equals(teacherId));
        teachingSpaceRepository.save(space);
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getCollectionsInSpace(UUID spaceId) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        return space.getCollections().stream().map(CollectionDTO::from).toList();
    }

    @Transactional
    public void addCollectionToSpace(UUID spaceId, UUID collectionId, User currentUser) {
        assertTeacherOrAdmin(currentUser, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        Collection collection = collectionRepository.findById(collectionId)
            .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada: " + collectionId));

        space.getCollections().add(collection);
        teachingSpaceRepository.save(space);
    }

    @Transactional
    public void removeCollectionFromSpace(UUID spaceId, UUID collectionId, User currentUser) {
        assertTeacherOrAdmin(currentUser, spaceId);

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        space.getCollections().removeIf(c -> c.getId().equals(collectionId));
        teachingSpaceRepository.save(space);
    }

    public void assertTeacherOrAdmin(User user, UUID spaceId) {
        if (user.getRole() == Role.ADMIN) return;
        boolean isTeacher = teachingSpaceRepository.isTeacherOfSpace(spaceId, user.getId());
        if (!isTeacher) {
            throw new AccessDeniedException("No tienes permisos de profesor en este espacio docente");
        }
    }

    private TeachingSpaceDTO toDTO(TeachingSpace space) {
        List<UUID> reqTagIds = space.getRequiredTagIds();
        List<Tag> tags = (!reqTagIds.isEmpty()) ? tagRepository.findAllByIdIn(reqTagIds) : Collections.emptyList();
        List<TagDTO> tagDTOs = tags.stream().map(TagDTO::fromEntity).toList();
        int studentCount = contextService.countMatchingStudents(reqTagIds);
        List<CollectionDTO> collections = space.getCollections() != null
            ? space.getCollections().stream().map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null))).toList()
            : Collections.emptyList();
        return TeachingSpaceDTO.fromEntity(space, tagDTOs, studentCount, collections);
    }
}

