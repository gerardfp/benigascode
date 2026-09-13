package com.benigascode.evaluation;

import com.benigascode.activities.domain.Activity;
import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.evaluation.domain.EvaluationJob;
import com.benigascode.evaluation.dto.ClaimJobResponse;
import com.benigascode.evaluation.dto.RunnerJobResultRequest;
import com.benigascode.evaluation.repository.EvaluationJobRepository;
import com.benigascode.evaluation.repository.EvaluationRepository;
import com.benigascode.evaluation.repository.TestResultRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.Course;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.repository.AttemptLedgerRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.benigascode.submissions.service.StudentProgressService;
import com.benigascode.evaluation.service.EvaluationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock
    private EvaluationJobRepository evaluationJobRepository;
    @Mock
    private EvaluationRepository evaluationRepository;
    @Mock
    private TestResultRepository testResultRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private AttemptLedgerRepository attemptLedgerRepository;
    @Mock
    private CourseMembershipRepository membershipRepository;
    @Mock
    private StudentProgressService studentProgressService;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private EvaluationService evaluationService;

    private User student;
    private User teacher;
    private Course course;
    private Activity activity;
    private ActivityVersion activityVersion;
    private ExerciseVersion exerciseVersion;
    private Submission submission;
    private EvaluationJob job;

    @BeforeEach
    void setUp() {
        student = new User("student@benigascode.local", "pass", "Student", Role.STUDENT);
        student.setId(UUID.randomUUID());

        teacher = new User("teacher@benigascode.local", "pass", "Teacher", Role.TEACHER);
        teacher.setId(UUID.randomUUID());

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
        exerciseVersion.setCompileConfig("{}");
        exerciseVersion.setRunConfig("{}");
        exerciseVersion.setComparatorConfig("{}");
        exerciseVersion.setTestsConfig("{\"public\":[],\"private\":[]}");

        activityVersion = new ActivityVersion();
        activityVersion.setId(UUID.randomUUID());
        activityVersion.setActivity(activity);
        activityVersion.setVersionNumber(1);
        activityVersion.setExerciseVersion(exerciseVersion);

        submission = new Submission(student, activityVersion, exerciseVersion, "code", "java");
        submission.setId(UUID.randomUUID());

        job = new EvaluationJob(submission);
        job.setId(UUID.randomUUID());
    }

    @Test
    void claimNextJob_Found_SetsClaimedAndReturnsPackage() throws Exception {
        when(evaluationJobRepository.claimNextJobNative()).thenReturn(Optional.of(job));
        when(evaluationJobRepository.save(any())).thenReturn(job);
        when(submissionRepository.save(any())).thenReturn(submission);
        when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.core.type.TypeReference.class)))
                .thenReturn(new java.util.HashMap<>());

        Optional<ClaimJobResponse> result = evaluationService.claimNextJob("runner-01");

        assertTrue(result.isPresent());
        assertEquals("CLAIMED", job.getStatus());
        assertEquals("runner-01", job.getWorkerId());
        assertNotNull(job.getLeaseUntil());
    }

    @Test
    void recordJobResult_Success_SavesEvaluationAndFinishesJob() {
        when(evaluationJobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        Evaluation savedEval = new Evaluation();
        savedEval.setId(UUID.randomUUID());
        when(evaluationRepository.save(any())).thenReturn(savedEval);

        RunnerJobResultRequest resultReq = new RunnerJobResultRequest(
                "CORRECT",
                new BigDecimal("100.00"),
                new RunnerJobResultRequest.CompileDetails(true, "", ""),
                List.of(new RunnerJobResultRequest.RunnerTestResult(
                        "pub-01", true, "PASSED", 25, "6.00", "", "6.00", "6.00", new BigDecimal("100.00")
                ))
        );

        evaluationService.recordJobResult(job.getId(), resultReq);

        assertEquals("FINISHED", job.getStatus());
        assertEquals("FINISHED", submission.getStatus());
        verify(evaluationRepository).save(any(Evaluation.class));
        verify(testResultRepository).save(any());
        verify(studentProgressService).updateProgress(eq(submission), any(Evaluation.class));
    }

    @Test
    void recordJobResult_Idempotent_DoesNotDuplicateOnFinished() {
        job.setStatus("FINISHED");
        when(evaluationJobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        RunnerJobResultRequest resultReq = new RunnerJobResultRequest(
                "CORRECT", BigDecimal.TEN, null, List.of()
        );

        evaluationService.recordJobResult(job.getId(), resultReq);

        verify(evaluationRepository, never()).save(any());
    }
}

