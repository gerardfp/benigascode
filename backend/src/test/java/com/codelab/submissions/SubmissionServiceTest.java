package com.codelab.submissions;

import com.codelab.activities.domain.Activity;
import com.codelab.activities.domain.ActivityVersion;
import com.codelab.activities.repository.ActivityRepository;
import com.codelab.activities.repository.ActivityVersionRepository;
import com.codelab.common.exception.InvalidAttemptException;
import com.codelab.common.exception.ResourceNotFoundException;
import com.codelab.content.domain.Exercise;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.evaluation.repository.EvaluationJobRepository;
import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;
import com.codelab.learning.domain.Course;
import com.codelab.learning.repository.CourseMembershipRepository;
import com.codelab.submissions.domain.Submission;
import com.codelab.submissions.dto.CreateSubmissionRequest;
import com.codelab.submissions.dto.SubmissionDTO;
import com.codelab.submissions.repository.AttemptLedgerRepository;
import com.codelab.submissions.repository.SubmissionRepository;
import com.codelab.submissions.service.SubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private AttemptLedgerRepository attemptLedgerRepository;
    @Mock
    private EvaluationJobRepository evaluationJobRepository;
    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private ActivityVersionRepository activityVersionRepository;
    @Mock
    private CourseMembershipRepository membershipRepository;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private SubmissionService submissionService;

    private User studentA;
    private User studentB;
    private Course course;
    private Activity activity;
    private ActivityVersion activityVersion;
    private ExerciseVersion exerciseVersion;

    @BeforeEach
    void setUp() {
        studentA = new User("studentA@codelab.local", "pass", "Student A", Role.STUDENT);
        studentA.setId(UUID.randomUUID());

        studentB = new User("studentB@codelab.local", "pass", "Student B", Role.STUDENT);
        studentB.setId(UUID.randomUUID());

        course = new Course("Java 101", "J101", "2026/27", "Desc");
        course.setId(UUID.randomUUID());

        activity = new Activity(course, "Práctica 1", "PRACTICE");
        activity.setId(UUID.randomUUID());

        Exercise exercise = new Exercise("calcular-media");
        exercise.setId(UUID.randomUUID());

        exerciseVersion = new ExerciseVersion();
        exerciseVersion.setId(UUID.randomUUID());
        exerciseVersion.setExercise(exercise);
        exerciseVersion.setVersionNumber(1);
        exerciseVersion.setTitle("Calcular Media");
        exerciseVersion.setLanguage("java");

        activityVersion = new ActivityVersion();
        activityVersion.setId(UUID.randomUUID());
        activityVersion.setActivity(activity);
        activityVersion.setVersionNumber(1);
        activityVersion.setExerciseVersion(exerciseVersion);
        activityVersion.setMaxAttempts(2);
    }

    @Test
    void createSubmission_FirstAttempt_Success() {
        when(activityRepository.findById(activity.getId())).thenReturn(Optional.of(activity));
        when(membershipRepository.existsByUserIdAndCourseId(studentA.getId(), course.getId())).thenReturn(true);
        when(activityVersionRepository.findLatestByActivityId(activity.getId())).thenReturn(Optional.of(activityVersion));
        when(attemptLedgerRepository.countConsumedAttempts(studentA.getId(), activityVersion.getId())).thenReturn(0L);

        Submission savedSub = new Submission(studentA, activityVersion, exerciseVersion, "code", "java");
        savedSub.setId(UUID.randomUUID());
        when(submissionRepository.save(any())).thenReturn(savedSub);

        SubmissionDTO result = submissionService.createSubmission(
                activity.getId(),
                exerciseVersion.getId(),
                new CreateSubmissionRequest("public class Main {}", "java"),
                studentA
        );

        assertNotNull(result);
        verify(attemptLedgerRepository).save(any());
        verify(evaluationJobRepository).save(any());
    }

    @Test
    void createSubmission_ExceedsMaxAttempts_ThrowsInvalidAttemptException() {
        when(activityRepository.findById(activity.getId())).thenReturn(Optional.of(activity));
        when(membershipRepository.existsByUserIdAndCourseId(studentA.getId(), course.getId())).thenReturn(true);
        when(activityVersionRepository.findLatestByActivityId(activity.getId())).thenReturn(Optional.of(activityVersion));
        when(attemptLedgerRepository.countConsumedAttempts(studentA.getId(), activityVersion.getId())).thenReturn(2L);

        assertThrows(InvalidAttemptException.class, () ->
            submissionService.createSubmission(
                    activity.getId(),
                    exerciseVersion.getId(),
                    new CreateSubmissionRequest("public class Main {}", "java"),
                    studentA
            )
        );

        verify(submissionRepository, never()).save(any());
        verify(evaluationJobRepository, never()).save(any());
    }

    @Test
    void getSubmissionById_IDOR_StudentCannotAccessOtherStudentSubmission() {
        Submission sub = new Submission(studentA, activityVersion, exerciseVersion, "code", "java");
        sub.setId(UUID.randomUUID());

        when(submissionRepository.findById(sub.getId())).thenReturn(Optional.of(sub));

        // StudentB intenta acceder a la submission de StudentA
        assertThrows(ResourceNotFoundException.class, () ->
            submissionService.getSubmissionById(sub.getId(), studentB)
        );
    }
}

