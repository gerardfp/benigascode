package com.benigascode.submissions;

import com.benigascode.activities.domain.Activity;
import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.activities.repository.ActivityRepository;
import com.benigascode.activities.repository.ActivityVersionRepository;
import com.benigascode.common.exception.InvalidAttemptException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.evaluation.repository.EvaluationJobRepository;
import com.benigascode.evaluation.repository.EvaluationRepository;
import com.benigascode.evaluation.repository.TestResultRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.dto.CreateSubmissionRequest;
import com.benigascode.submissions.dto.SubmissionDTO;
import com.benigascode.submissions.repository.AttemptLedgerRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.benigascode.submissions.service.SubmissionService;
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
    private EvaluationRepository evaluationRepository;
    @Mock
    private TestResultRepository testResultRepository;
    @Mock
    private AttemptLedgerRepository attemptLedgerRepository;
    @Mock
    private EvaluationJobRepository evaluationJobRepository;
    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private ActivityVersionRepository activityVersionRepository;
    @Mock
    private ExerciseRepository exerciseRepository;
    @Mock
    private ExerciseVersionRepository exerciseVersionRepository;
    @Mock
    private TeachingSpaceRepository teachingSpaceRepository;
    @Mock
    private ContextService contextService;
    @Mock
    private StudentTagRepository studentTagRepository;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private SubmissionService submissionService;

    private User studentA;
    private User studentB;
    private TeachingSpace space;
    private Activity activity;
    private ActivityVersion activityVersion;
    private ExerciseVersion exerciseVersion;

    @BeforeEach
    void setUp() {
        studentA = new User("studentA@benigascode.local", "pass", "Student A", Role.STUDENT);
        studentA.setId(UUID.randomUUID());

        studentB = new User("studentB@benigascode.local", "pass", "Student B", Role.STUDENT);
        studentB.setId(UUID.randomUUID());

        space = new TeachingSpace("Java 101", null);
        space.setId(UUID.randomUUID());

        activity = new Activity(space, "Práctica 1", "PRACTICE");
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
        when(contextService.studentMatchesSpace(studentA.getId(), space)).thenReturn(true);
        when(activityVersionRepository.findLatestByActivityId(activity.getId())).thenReturn(Optional.of(activityVersion));
        when(attemptLedgerRepository.countConsumedAttempts(studentA.getId(), activityVersion.getId())).thenReturn(0L);

        Submission savedSub = new Submission(studentA, activityVersion, exerciseVersion, "code", "java");
        savedSub.setId(UUID.randomUUID());
        savedSub.setTeachingSpaceId(space.getId());
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
        when(contextService.studentMatchesSpace(studentA.getId(), space)).thenReturn(true);
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
