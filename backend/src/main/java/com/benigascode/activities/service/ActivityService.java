package com.benigascode.activities.service;

import com.benigascode.activities.domain.Activity;
import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.activities.dto.ActivityDTO;
import com.benigascode.activities.dto.CreateActivityRequest;
import com.benigascode.activities.repository.ActivityRepository;
import com.benigascode.activities.repository.ActivityVersionRepository;
import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityVersionRepository activityVersionRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final ContextService contextService;

    public ActivityService(ActivityRepository activityRepository,
                           ActivityVersionRepository activityVersionRepository,
                           TeachingSpaceRepository teachingSpaceRepository,
                           ExerciseVersionRepository exerciseVersionRepository,
                           ContextService contextService) {
        this.activityRepository = activityRepository;
        this.activityVersionRepository = activityVersionRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.contextService = contextService;
    }

    @Transactional
    public ActivityDTO createActivity(CreateActivityRequest request, User teacher) {
        UUID spaceId = request.getEffectiveTeachingSpaceId();
        if (spaceId == null) {
            throw new ValidationException("El ID del espacio docente es obligatorio");
        }

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        assertTeacherOrAdmin(teacher, space.getId());

        ExerciseVersion exerciseVersion = exerciseVersionRepository.findById(request.exerciseVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada: " + request.exerciseVersionId()));

        Activity activity = new Activity(space, request.name(), request.type());
        activity = activityRepository.save(activity);

        ActivityVersion version = new ActivityVersion();
        version.setActivity(activity);
        version.setVersionNumber(1);
        version.setExerciseVersion(exerciseVersion);
        version.setMaxAttempts(request.maxAttempts());
        version.setAvailableFrom(request.availableFrom());
        version.setAvailableUntil(request.availableUntil());
        version.setDueAt(request.dueAt());
        version = activityVersionRepository.save(version);

        return ActivityDTO.from(activity, version);
    }

    @Transactional
    public ActivityDTO updateActivity(UUID activityId, CreateActivityRequest request, User teacher) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada: " + activityId));

        assertTeacherOrAdmin(teacher, activity.getTeachingSpace().getId());

        ExerciseVersion exerciseVersion = exerciseVersionRepository.findById(request.exerciseVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada: " + request.exerciseVersionId()));

        activity.setName(request.name());
        activity.setType(request.type());
        activity = activityRepository.save(activity);

        Optional<ActivityVersion> latestOpt = activityVersionRepository.findLatestByActivityId(activityId);
        int nextVersion = latestOpt.map(v -> v.getVersionNumber() + 1).orElse(1);

        ActivityVersion version = new ActivityVersion();
        version.setActivity(activity);
        version.setVersionNumber(nextVersion);
        version.setExerciseVersion(exerciseVersion);
        version.setMaxAttempts(request.maxAttempts());
        version.setAvailableFrom(request.availableFrom());
        version.setAvailableUntil(request.availableUntil());
        version.setDueAt(request.dueAt());
        version = activityVersionRepository.save(version);

        return ActivityDTO.from(activity, version);
    }

    @Transactional(readOnly = true)
    public List<ActivityDTO> getActivitiesForUser(User user) {
        if (user.getRole() == Role.ADMIN) {
            return activityRepository.findAll().stream()
                    .map(a -> ActivityDTO.from(a, activityVersionRepository.findLatestByActivityId(a.getId()).orElse(null)))
                    .toList();
        }

        if (user.getRole() == Role.TEACHER) {
            List<TeachingSpace> teacherSpaces = teachingSpaceRepository.findByTeacherId(user.getId());
            if (teacherSpaces.isEmpty()) {
                return Collections.emptyList();
            }
            List<UUID> spaceIds = teacherSpaces.stream().map(TeachingSpace::getId).toList();
            return activityRepository.findByTeachingSpaceIdIn(spaceIds).stream()
                    .map(a -> ActivityDTO.from(a, activityVersionRepository.findLatestByActivityId(a.getId()).orElse(null)))
                    .toList();
        }

        // ALUMNO: Obtener espacios donde cumple el contexto
        List<TeachingSpace> studentSpaces = contextService.findSpacesForStudent(user);
        if (studentSpaces.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> spaceIds = studentSpaces.stream().map(TeachingSpace::getId).toList();
        return activityRepository.findByTeachingSpaceIdIn(spaceIds).stream()
                .map(a -> ActivityDTO.from(a, activityVersionRepository.findLatestByActivityId(a.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityDTO> getActivitiesForSpace(UUID spaceId, User user) {
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

        return activityRepository.findByTeachingSpaceId(spaceId).stream()
                .map(a -> ActivityDTO.from(a, activityVersionRepository.findLatestByActivityId(a.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityDTO getActivityById(UUID activityId, User user) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada"));

        TeachingSpace space = activity.getTeachingSpace();

        if (user.getRole() == Role.STUDENT) {
            boolean matches = contextService.studentMatchesContext(user.getId(), space.getRequiredTagIds());
            if (!matches) {
                throw new ResourceNotFoundException("Actividad no encontrada");
            }
        } else if (user.getRole() == Role.TEACHER) {
            assertTeacherOrAdmin(user, space.getId());
        }

        ActivityVersion version = activityVersionRepository.findLatestByActivityId(activityId).orElse(null);
        return ActivityDTO.from(activity, version);
    }

    public void assertTeacherOrAdmin(User user, UUID spaceId) {
        if (user.getRole() == Role.ADMIN) return;
        boolean isTeacher = teachingSpaceRepository.isTeacherOfSpace(spaceId, user.getId());
        if (!isTeacher) {
            throw new AccessDeniedException("No tienes permisos de profesor en este espacio docente");
        }
    }
}
