package com.codelab.activities.service;

import com.codelab.activities.domain.Activity;
import com.codelab.activities.domain.ActivityVersion;
import com.codelab.activities.dto.ActivityDTO;
import com.codelab.activities.dto.CreateActivityRequest;
import com.codelab.activities.repository.ActivityRepository;
import com.codelab.activities.repository.ActivityVersionRepository;
import com.codelab.common.exception.AccessDeniedException;
import com.codelab.common.exception.ResourceNotFoundException;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.content.repository.ExerciseVersionRepository;
import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;
import com.codelab.learning.domain.Course;
import com.codelab.learning.repository.CourseMembershipRepository;
import com.codelab.learning.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityVersionRepository activityVersionRepository;
    private final CourseRepository courseRepository;
    private final CourseMembershipRepository membershipRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;

    public ActivityService(ActivityRepository activityRepository,
                           ActivityVersionRepository activityVersionRepository,
                           CourseRepository courseRepository,
                           CourseMembershipRepository membershipRepository,
                           ExerciseVersionRepository exerciseVersionRepository) {
        this.activityRepository = activityRepository;
        this.activityVersionRepository = activityVersionRepository;
        this.courseRepository = courseRepository;
        this.membershipRepository = membershipRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
    }

    @Transactional
    public ActivityDTO createActivity(CreateActivityRequest request, User teacher) {
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));

        assertTeacherOrAdmin(teacher, course.getId());

        ExerciseVersion exerciseVersion = exerciseVersionRepository.findById(request.exerciseVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada"));

        Activity activity = new Activity(course, request.name(), request.type());
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
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada"));

        assertTeacherOrAdmin(teacher, activity.getCourse().getId());

        ExerciseVersion exerciseVersion = exerciseVersionRepository.findById(request.exerciseVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada"));

        // Actualizar datos administrativos estables
        activity.setName(request.name());
        activity.setType(request.type());
        activity = activityRepository.save(activity);

        // Crear una nueva versión inmutable (ActivityVersion)
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

        return activityRepository.findActivitiesByUserId(user.getId()).stream()
                .map(a -> ActivityDTO.from(a, activityVersionRepository.findLatestByActivityId(a.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityDTO getActivityById(UUID activityId, User user) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada"));

        if (user.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseId(user.getId(), activity.getCourse().getId())) {
            throw new ResourceNotFoundException("Actividad no encontrada");
        }

        ActivityVersion version = activityVersionRepository.findLatestByActivityId(activityId).orElse(null);
        return ActivityDTO.from(activity, version);
    }

    public void assertTeacherOrAdmin(User user, UUID courseId) {
        if (user.getRole() == Role.ADMIN) return;
        boolean isTeacher = membershipRepository.existsByUserIdAndCourseIdAndRole(user.getId(), courseId, "TEACHER");
        if (!isTeacher) {
            throw new AccessDeniedException("No tienes permisos de profesor en este curso");
        }
    }
}

