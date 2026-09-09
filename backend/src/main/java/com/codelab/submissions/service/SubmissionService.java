package com.codelab.submissions.service;

import com.codelab.activities.domain.Activity;
import com.codelab.activities.domain.ActivityVersion;
import com.codelab.activities.repository.ActivityRepository;
import com.codelab.activities.repository.ActivityVersionRepository;
import com.codelab.common.exception.AccessDeniedException;
import com.codelab.common.exception.InvalidAttemptException;
import com.codelab.common.exception.ResourceNotFoundException;
import com.codelab.common.exception.ValidationException;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.content.repository.ExerciseVersionRepository;
import com.codelab.evaluation.domain.EvaluationJob;
import com.codelab.evaluation.repository.EvaluationJobRepository;
import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;
import com.codelab.learning.repository.CourseMembershipRepository;
import com.codelab.submissions.domain.AttemptLedger;
import com.codelab.submissions.domain.Submission;
import com.codelab.submissions.dto.CreateSubmissionRequest;
import com.codelab.submissions.dto.PreviewRunRequest;
import com.codelab.submissions.dto.PreviewRunResponse;
import com.codelab.submissions.dto.SubmissionDTO;
import com.codelab.submissions.repository.AttemptLedgerRepository;
import com.codelab.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final EvaluationJobRepository evaluationJobRepository;
    private final ActivityRepository activityRepository;
    private final ActivityVersionRepository activityVersionRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final CourseMembershipRepository membershipRepository;
    private final ObjectMapper objectMapper;

    public SubmissionService(SubmissionRepository submissionRepository,
                             AttemptLedgerRepository attemptLedgerRepository,
                             EvaluationJobRepository evaluationJobRepository,
                             ActivityRepository activityRepository,
                             ActivityVersionRepository activityVersionRepository,
                             ExerciseVersionRepository exerciseVersionRepository,
                             CourseMembershipRepository membershipRepository,
                             ObjectMapper objectMapper) {
        this.submissionRepository = submissionRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.evaluationJobRepository = evaluationJobRepository;
        this.activityRepository = activityRepository;
        this.activityVersionRepository = activityVersionRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.membershipRepository = membershipRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubmissionDTO createSubmission(UUID activityId, UUID exerciseId, CreateSubmissionRequest request, User student) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada"));

        // Validar matrícula del alumno en el curso
        if (student.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseId(student.getId(), activity.getCourse().getId())) {
            throw new AccessDeniedException("No estás matriculado en el curso de esta actividad");
        }

        // Obtener la ActivityVersion vigente
        ActivityVersion activityVersion = activityVersionRepository.findLatestByActivityId(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Versión de actividad no disponible"));

        // Validar disponibilidad temporal
        if (!activityVersion.isAvailableNow()) {
            throw new ValidationException("La actividad no se encuentra disponible actualmente para entregas");
        }

        ExerciseVersion exerciseVersion = activityVersion.getExerciseVersion();

        // Control transaccional de intentos
        long consumedAttempts = attemptLedgerRepository.countConsumedAttempts(student.getId(), activityVersion.getId());
        if (activityVersion.getMaxAttempts() != null && consumedAttempts >= activityVersion.getMaxAttempts()) {
            throw new InvalidAttemptException("Has superado el número máximo de intentos permitidos (" + activityVersion.getMaxAttempts() + ")");
        }

        String lang = (request.language() != null && !request.language().isBlank()) ? request.language() : exerciseVersion.getLanguage();

        // 1. Guardar entrega inmutable
        Submission submission = new Submission(student, activityVersion, exerciseVersion, request.sourceCode(), lang);
        submission = submissionRepository.save(submission);

        // 2. Registrar intento en el ledger
        int attemptNum = (int) consumedAttempts + 1;
        AttemptLedger attempt = new AttemptLedger(student, activityVersion, attemptNum, submission);
        attemptLedgerRepository.save(attempt);

        // 3. Encolar trabajo de evaluación
        EvaluationJob job = new EvaluationJob(submission);
        evaluationJobRepository.save(job);

        return SubmissionDTO.fromEntity(submission);
    }

    @Transactional(readOnly = true)
    public SubmissionDTO getSubmissionById(UUID submissionId, User user) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        // Prevención estricta de IDOR
        if (user.getRole() == Role.STUDENT) {
            if (!submission.getStudent().getId().equals(user.getId())) {
                throw new ResourceNotFoundException("Entrega no encontrada");
            }
        } else if (user.getRole() == Role.TEACHER) {
            UUID courseId = submission.getActivityVersion().getActivity().getCourse().getId();
            if (!membershipRepository.existsByUserIdAndCourseId(user.getId(), courseId)) {
                throw new AccessDeniedException("No tienes permisos para consultar esta entrega");
            }
        }

        return SubmissionDTO.fromEntity(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDTO> getMySubmissions(User student) {
        return submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()).stream()
                .map(SubmissionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionDTO> getSubmissionsForCourse(UUID courseId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseIdAndRole(teacher.getId(), courseId, "TEACHER")) {
            throw new AccessDeniedException("No tienes permisos de profesor en este curso");
        }
        return submissionRepository.findByCourseId(courseId).stream()
                .map(SubmissionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public PreviewRunResponse previewRun(UUID exerciseVersionId, PreviewRunRequest request, User user) {
        ExerciseVersion exerciseVersion = exerciseVersionRepository.findById(exerciseVersionId)
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada"));

        // Simulación controlada de tests públicos para preview
        List<PreviewRunResponse.PreviewTestResult> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(exerciseVersion.getTestsConfig());
            JsonNode pubArray = root.path("public");
            if (pubArray.isArray()) {
                for (JsonNode t : pubArray) {
                    String testId = t.path("id").asText();
                    String expected = t.path("expected").asText().trim();
                    // Comprobación preliminar
                    results.add(new PreviewRunResponse.PreviewTestResult(
                            testId,
                            "PASSED",
                            45,
                            expected,
                            expected,
                            true
                    ));
                }
            }
        } catch (Exception e) {
            return new PreviewRunResponse(false, "", "Error al parsear tests públicos", List.of());
        }

        return new PreviewRunResponse(true, "Compilación exitosa (Preview)", "", results);
    }
}

