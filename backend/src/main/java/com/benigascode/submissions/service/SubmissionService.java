package com.benigascode.submissions.service;

import com.benigascode.activities.domain.Activity;
import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.activities.repository.ActivityRepository;
import com.benigascode.activities.repository.ActivityVersionRepository;
import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.InvalidAttemptException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.evaluation.domain.EvaluationJob;
import com.benigascode.evaluation.repository.EvaluationJobRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.submissions.domain.AttemptLedger;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.dto.CreateSubmissionRequest;
import com.benigascode.submissions.dto.PreviewRunRequest;
import com.benigascode.submissions.dto.PreviewRunResponse;
import com.benigascode.submissions.dto.SubmissionDTO;
import com.benigascode.submissions.repository.AttemptLedgerRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

    @Value("${benigascode.runner.url:http://runner:5000}")
    private String runnerUrl;

    @Value("${benigascode.runner.token:dev_runner_token_secure_12345}")
    private String runnerToken;

    private final SubmissionRepository submissionRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final EvaluationJobRepository evaluationJobRepository;
    private final ActivityRepository activityRepository;
    private final ActivityVersionRepository activityVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final CourseMembershipRepository membershipRepository;
    private final ObjectMapper objectMapper;

    public SubmissionService(SubmissionRepository submissionRepository,
                             AttemptLedgerRepository attemptLedgerRepository,
                             EvaluationJobRepository evaluationJobRepository,
                             ActivityRepository activityRepository,
                             ActivityVersionRepository activityVersionRepository,
                             ExerciseRepository exerciseRepository,
                             ExerciseVersionRepository exerciseVersionRepository,
                             CourseMembershipRepository membershipRepository,
                             ObjectMapper objectMapper) {
        this.submissionRepository = submissionRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.evaluationJobRepository = evaluationJobRepository;
        this.activityRepository = activityRepository;
        this.activityVersionRepository = activityVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.membershipRepository = membershipRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubmissionDTO createSubmission(UUID activityId, UUID exerciseId, CreateSubmissionRequest request, User student) {
        ExerciseVersion exerciseVersion;
        ActivityVersion activityVersion = null;
        int attemptNum;

        if (activityId != null) {
            Activity activity = activityRepository.findById(activityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Actividad no encontrada"));

            // Validar matrícula del alumno en el curso
            if (student.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseId(student.getId(), activity.getCourse().getId())) {
                throw new AccessDeniedException("No estás matriculado en el curso de esta actividad");
            }

            // Obtener la ActivityVersion vigente
            activityVersion = activityVersionRepository.findLatestByActivityId(activityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Versión de actividad no disponible"));

            // Validar disponibilidad temporal
            if (!activityVersion.isAvailableNow()) {
                throw new ValidationException("La actividad no se encuentra disponible actualmente para entregas");
            }

            exerciseVersion = activityVersion.getExerciseVersion();

            // Control transaccional de intentos
            long consumedAttempts = attemptLedgerRepository.countConsumedAttempts(student.getId(), activityVersion.getId());
            if (activityVersion.getMaxAttempts() != null && consumedAttempts >= activityVersion.getMaxAttempts()) {
                throw new InvalidAttemptException("Has superado el número máximo de intentos permitidos (" + activityVersion.getMaxAttempts() + ")");
            }

            attemptNum = (int) consumedAttempts + 1;
        } else {
            // Entrega directa de ejercicio (práctica)
            exerciseVersion = exerciseVersionRepository.findById(exerciseId)
                    .or(() -> exerciseRepository.findById(exerciseId).flatMap(e -> exerciseVersionRepository.findLatestByExerciseId(e.getId())))
                    .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

            long consumedAttempts = attemptLedgerRepository.countConsumedExerciseAttempts(student.getId(), exerciseVersion.getId());
            attemptNum = (int) consumedAttempts + 1;
        }

        String lang = (request.language() != null && !request.language().isBlank()) ? request.language() : exerciseVersion.getLanguage();

        // 1. Guardar entrega inmutable snapshot
        Submission submission = new Submission(student, activityVersion, exerciseVersion, request.sourceCode(), lang);
        submission.setAttemptNumber(attemptNum);
        submission = submissionRepository.save(submission);

        // 2. Registrar intento en el ledger
        AttemptLedger attempt = activityVersion != null ?
                new AttemptLedger(student, activityVersion, attemptNum, submission) :
                new AttemptLedger(student, exerciseVersion, attemptNum, submission);
        attemptLedgerRepository.save(attempt);

        // 3. Encolar trabajo de evaluación oficial
        EvaluationJob job = new EvaluationJob(submission);
        evaluationJobRepository.save(job);

        return SubmissionDTO.fromEntity(submission);
    }

    @Transactional
    public SubmissionDTO createDirectSubmission(UUID exerciseId, CreateSubmissionRequest request, User student) {
        return createSubmission(null, exerciseId, request, student);
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
        } else if (user.getRole() == Role.TEACHER && submission.getActivityVersion() != null) {
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
    public List<SubmissionDTO> getSubmissionHistory(UUID exerciseId, User student) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        return submissionRepository.findByStudentAndExercise(student.getId(), exercise.getId()).stream()
                .map(SubmissionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionDTO getLatestSubmission(UUID exerciseId, UUID activityId, User student) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        List<Submission> list = submissionRepository.findByStudentAndExerciseAndOptionalActivity(student.getId(), exercise.getId(), activityId);
        return list.isEmpty() ? null : SubmissionDTO.fromEntity(list.get(0));
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
                .or(() -> exerciseRepository.findById(exerciseVersionId).flatMap(e -> exerciseVersionRepository.findLatestByExerciseId(e.getId())))
                .orElseThrow(() -> new ResourceNotFoundException("Versión del ejercicio no encontrada"));

        try {
            Map<String, Object> compileConfig = objectMapper.readValue(exerciseVersion.getCompileConfig(), new TypeReference<>() {});
            Map<String, Object> runConfig = objectMapper.readValue(exerciseVersion.getRunConfig(), new TypeReference<>() {});
            Map<String, Object> comparatorConfig = objectMapper.readValue(exerciseVersion.getComparatorConfig(), new TypeReference<>() {});

            Map<String, Object> testsRoot = objectMapper.readValue(exerciseVersion.getTestsConfig(), new TypeReference<>() {});
            List<Map<String, Object>> publicTests = (List<Map<String, Object>>) testsRoot.getOrDefault("public", List.of());

            Map<String, Object> payload = new HashMap<>();
            payload.put("sourceCode", request.sourceCode());
            payload.put("language", request.language() != null ? request.language() : exerciseVersion.getLanguage());
            payload.put("compileConfig", compileConfig);
            payload.put("runConfig", runConfig);
            payload.put("comparator", comparatorConfig);
            payload.put("tests", publicTests);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(runnerUrl + "/evaluate"))
                    .header("Content-Type", "application/json")
                    .header("X-Runner-Token", runnerToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(20))
                    .build();

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode resNode = objectMapper.readTree(response.body());
                JsonNode compileNode = resNode.path("compile");
                boolean compileSuccess = compileNode.path("success").asBoolean();
                String stdout = compileNode.path("stdout").asText("");
                String stderr = compileNode.path("stderr").asText("");

                List<PreviewRunResponse.PreviewTestResult> results = new ArrayList<>();
                JsonNode testsArr = resNode.has("testResults") ? resNode.path("testResults") : resNode.path("test_results");
                if (testsArr.isArray()) {
                    for (JsonNode t : testsArr) {
                        String testId = t.has("testId") ? t.path("testId").asText() : t.path("test_id").asText();
                        String fallbackName = publicTests.stream()
                                .filter(pt -> testId.equals(pt.get("id")))
                                .map(pt -> (String) pt.get("name"))
                                .findFirst()
                                .orElse(testId);
                        String testName = t.has("testName") ? t.path("testName").asText() : (t.has("name") ? t.path("name").asText() : fallbackName);
                        results.add(new PreviewRunResponse.PreviewTestResult(
                                testId,
                                testName,
                                t.path("status").asText(),
                                t.has("durationMs") ? t.path("durationMs").asInt() : t.path("duration_ms").asInt(),
                                t.path("stdout").asText(),
                                t.has("expectedOutput") ? t.path("expectedOutput").asText() : t.path("expected_output").asText(),
                                t.path("passed").asBoolean()
                        ));
                    }
                }
                return new PreviewRunResponse(compileSuccess, stdout, stderr, results);
            } else {
                return new PreviewRunResponse(false, "", "Error HTTP " + response.statusCode() + " al comunicar con runner: " + response.body(), List.of());
            }
        } catch (Exception e) {
            log.error("Error al ejecutar previewRun", e);
            return new PreviewRunResponse(false, "", "Error de ejecución: " + e.getMessage(), List.of());
        }
    }
}
