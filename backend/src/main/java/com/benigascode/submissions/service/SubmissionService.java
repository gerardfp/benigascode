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
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.evaluation.domain.EvaluationJob;
import com.benigascode.evaluation.domain.TestResult;
import com.benigascode.evaluation.dto.EvaluationDTO;
import com.benigascode.evaluation.dto.TestResultDTO;
import com.benigascode.evaluation.repository.EvaluationJobRepository;
import com.benigascode.evaluation.repository.EvaluationRepository;
import com.benigascode.evaluation.repository.TestResultRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.submissions.domain.AttemptLedger;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.dto.CreateSubmissionRequest;
import com.benigascode.submissions.dto.PreviewRunRequest;
import com.benigascode.submissions.dto.PreviewRunResponse;
import com.benigascode.submissions.dto.SubmissionDTO;
import com.benigascode.submissions.dto.TeacherSubmissionDetailDTO;
import com.benigascode.submissions.dto.TeacherSubmissionItemDTO;
import com.benigascode.submissions.repository.AttemptLedgerRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.benigascode.common.util.LanguageDetector;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.submissions.domain.StudentCollectionPreference;
import com.benigascode.submissions.repository.StudentCollectionPreferenceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

    @Value("${benigascode.runner.url:http://runner:5000}")
    private String runnerUrl;

    @Value("${benigascode.runner.token:dev_runner_token_secure_12345}")
    private String runnerToken;

    private final SubmissionRepository submissionRepository;
    private final EvaluationRepository evaluationRepository;
    private final TestResultRepository testResultRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final EvaluationJobRepository evaluationJobRepository;
    private final ActivityRepository activityRepository;
    private final ActivityVersionRepository activityVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final ContextService contextService;
    private final StudentTagRepository studentTagRepository;
    private final CollectionRepository collectionRepository;
    private final StudentCollectionPreferenceRepository studentCollectionPreferenceRepository;
    private final ObjectMapper objectMapper;

    public SubmissionService(SubmissionRepository submissionRepository,
                             EvaluationRepository evaluationRepository,
                             TestResultRepository testResultRepository,
                             AttemptLedgerRepository attemptLedgerRepository,
                             EvaluationJobRepository evaluationJobRepository,
                             ActivityRepository activityRepository,
                             ActivityVersionRepository activityVersionRepository,
                             ExerciseRepository exerciseRepository,
                             ExerciseVersionRepository exerciseVersionRepository,
                             TeachingSpaceRepository teachingSpaceRepository,
                             ContextService contextService,
                             StudentTagRepository studentTagRepository,
                             CollectionRepository collectionRepository,
                             StudentCollectionPreferenceRepository studentCollectionPreferenceRepository,
                             ObjectMapper objectMapper) {
        this.submissionRepository = submissionRepository;
        this.evaluationRepository = evaluationRepository;
        this.testResultRepository = testResultRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.evaluationJobRepository = evaluationJobRepository;
        this.activityRepository = activityRepository;
        this.activityVersionRepository = activityVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.contextService = contextService;
        this.studentTagRepository = studentTagRepository;
        this.collectionRepository = collectionRepository;
        this.studentCollectionPreferenceRepository = studentCollectionPreferenceRepository;
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

            TeachingSpace space = activity.getTeachingSpace();
            if (student.getRole() != Role.ADMIN && !contextService.studentMatchesSpace(student.getId(), space)) {
                throw new AccessDeniedException("No tienes acceso al espacio docente de esta actividad");
            }

            activityVersion = activityVersionRepository.findLatestByActivityId(activityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Versión de actividad no disponible"));

            if (!activityVersion.isAvailableNow()) {
                throw new ValidationException("La actividad no se encuentra disponible actualmente para entregas");
            }

            exerciseVersion = activityVersion.getExerciseVersion();

            long consumedAttempts = attemptLedgerRepository.countConsumedAttempts(student.getId(), activityVersion.getId());
            if (activityVersion.getMaxAttempts() != null && consumedAttempts >= activityVersion.getMaxAttempts()) {
                throw new InvalidAttemptException("Has superado el número máximo de intentos permitidos (" + activityVersion.getMaxAttempts() + ")");
            }

            long maxAttempt = attemptLedgerRepository.findMaxAttemptNumberForActivity(student.getId(), activityVersion.getId());
            attemptNum = (int) maxAttempt + 1;
        } else {
            exerciseVersion = exerciseVersionRepository.findById(exerciseId)
                    .or(() -> exerciseRepository.findById(exerciseId).flatMap(e -> exerciseVersionRepository.findLatestByExerciseId(e.getId())))
                    .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

            long maxAttempt = attemptLedgerRepository.findMaxAttemptNumberForExercise(student.getId(), exerciseVersion.getId());
            attemptNum = (int) maxAttempt + 1;
        }

        String lang = (request.language() != null && !request.language().isBlank()) ? request.language() : exerciseVersion.getLanguage();
        String detectedLang = LanguageDetector.detect(request.sourceCode(), request.language());
        if (detectedLang == null || detectedLang.isBlank()) {
            detectedLang = exerciseVersion.getLanguage() != null ? exerciseVersion.getLanguage() : "java";
        }
        detectedLang = detectedLang.toLowerCase();

        Submission submission = new Submission(student, activityVersion, exerciseVersion, request.sourceCode(), detectedLang);
        submission.setAttemptNumber(attemptNum);
        if ("python".equalsIgnoreCase(detectedLang)) {
            submission.setRuntimeId("python-314");
        } else {
            submission.setRuntimeId("java-26");
        }

        if (activityVersion != null && activityVersion.getActivity() != null && activityVersion.getActivity().getTeachingSpace() != null) {
            submission.setTeachingSpaceId(activityVersion.getActivity().getTeachingSpace().getId());
        } else if (request.getEffectiveTeachingSpaceId() != null) {
            submission.setTeachingSpaceId(request.getEffectiveTeachingSpaceId());
        }

        if (request.collectionId() != null) {
            submission.setCollectionId(request.collectionId());
            final String finalLang = detectedLang;
            studentCollectionPreferenceRepository.findByStudentIdAndCollectionId(student.getId(), request.collectionId())
                    .ifPresentOrElse(
                            pref -> {
                                pref.setLastUsedLanguage(finalLang);
                                studentCollectionPreferenceRepository.save(pref);
                            },
                            () -> {
                                collectionRepository.findById(request.collectionId()).ifPresent(col -> {
                                    studentCollectionPreferenceRepository.save(new StudentCollectionPreference(student, col, finalLang));
                                });
                            }
                    );
        }
        submission = submissionRepository.save(submission);

        AttemptLedger attempt = activityVersion != null ?
                new AttemptLedger(student, activityVersion, attemptNum, submission) :
                new AttemptLedger(student, exerciseVersion, attemptNum, submission);
        attemptLedgerRepository.save(attempt);

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

        if (user.getRole() == Role.STUDENT) {
            if (!submission.getStudent().getId().equals(user.getId())) {
                throw new ResourceNotFoundException("Entrega no encontrada");
            }
        } else if (user.getRole() == Role.TEACHER && submission.getActivityVersion() != null && submission.getActivityVersion().getActivity() != null) {
            UUID spaceId = submission.getActivityVersion().getActivity().getTeachingSpace().getId();
            if (!teachingSpaceRepository.isTeacherOfSpace(spaceId, user.getId())) {
                throw new AccessDeniedException("No tienes permisos para consultar esta entrega");
            }
        }

        return toEnrichedDTO(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDTO> getMySubmissions(User student) {
        return submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()).stream()
                .map(this::toEnrichedDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionDTO> getSubmissionHistory(UUID exerciseId, User student) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        return submissionRepository.findByStudentAndExercise(student.getId(), exercise.getId()).stream()
                .map(this::toEnrichedDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionDTO getLatestSubmission(UUID exerciseId, UUID activityId, User student) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        List<Submission> list = submissionRepository.findByStudentAndExerciseAndOptionalActivity(student.getId(), exercise.getId(), activityId);
        return list.isEmpty() ? null : toEnrichedDTO(list.get(0));
    }

    private SubmissionDTO toEnrichedDTO(Submission s) {
        Optional<Evaluation> evalOpt = evaluationRepository.findLatestBySubmissionId(s.getId());
        String evalStatus = evalOpt.map(Evaluation::getStatus).orElse(s.getStatus());
        BigDecimal score = evalOpt.map(Evaluation::getScore).orElse(BigDecimal.ZERO);
        Boolean compileSuccess = evalOpt.map(Evaluation::getCompileSuccess).orElse(null);

        int testsPassed = 0;
        int totalTests = 0;
        if (evalOpt.isPresent()) {
            List<TestResult> trList = testResultRepository.findByEvaluationId(evalOpt.get().getId());
            totalTests = trList.size();
            testsPassed = (int) trList.stream().filter(tr -> "PASSED".equalsIgnoreCase(tr.getStatus())).count();
        }

        return SubmissionDTO.fromEntity(s, evalStatus, score, testsPassed, totalTests, compileSuccess);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDTO> getSubmissionsForCourse(UUID courseId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && !teachingSpaceRepository.isTeacherOfSpace(courseId, teacher.getId())) {
            throw new AccessDeniedException("No tienes permisos de profesor en este espacio docente");
        }
        return submissionRepository.findByTeachingSpaceId(courseId).stream()
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

            String detectedLang = LanguageDetector.detect(request.sourceCode(), request.language());
            if (detectedLang == null || detectedLang.isBlank()) {
                detectedLang = exerciseVersion.getLanguage() != null ? exerciseVersion.getLanguage() : "java";
            }
            detectedLang = detectedLang.toLowerCase();

            if ("python".equalsIgnoreCase(detectedLang)) {
                String cmd = (String) compileConfig.get("command");
                if (cmd == null || cmd.contains("javac")) {
                    compileConfig.put("command", "python3 -m py_compile solution.py");
                }
                String runCmd = (String) runConfig.get("command");
                if (runCmd == null || runCmd.contains("java ")) {
                    runConfig.put("command", "python3 solution.py");
                }
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("sourceCode", request.sourceCode());
            payload.put("language", request.language() != null ? request.language() : exerciseVersion.getLanguage());
            payload.put("language", detectedLang);
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

    @Transactional(readOnly = true)
    public List<TeacherSubmissionItemDTO> getTeacherSubmissions(UUID courseId, UUID groupId, UUID studentId, UUID exerciseId, String status, String search, User teacher) {
        if (teacher.getRole() != Role.ADMIN && teacher.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("Operación restringida a profesores");
        }

        List<Submission> allSubs;
        if (courseId != null) {
            allSubs = submissionRepository.findByTeachingSpaceId(courseId);
        } else {
            allSubs = submissionRepository.findAllByOrderByCreatedAtDesc();
        }

        Map<UUID, String> groupNamesByStudent = new HashMap<>();
        List<TeacherSubmissionItemDTO> items = new ArrayList<>();
        String searchLower = search != null ? search.trim().toLowerCase() : null;

        for (Submission s : allSubs) {
            if (studentId != null && !s.getStudent().getId().equals(studentId)) {
                continue;
            }
            if (exerciseId != null) {
                UUID sExId = s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null ?
                        s.getExerciseVersion().getExercise().getId() : null;
                if (!exerciseId.equals(sExId)) {
                    continue;
                }
            }

            String grpName = groupNamesByStudent.computeIfAbsent(s.getStudent().getId(), stId -> {
                List<StudentTag> active = studentTagRepository.findActiveByStudentId(stId, s.getCreatedAt());
                for (StudentTag st : active) {
                    if ("group".equalsIgnoreCase(st.getTag().getCategory())) {
                        return st.getTag().getValue();
                    }
                }
                return active.isEmpty() ? "General" : active.get(0).getTag().getValue();
            });

            if (groupId != null) {
                boolean hasTag = studentTagRepository.findActiveByStudentId(s.getStudent().getId(), s.getCreatedAt())
                        .stream().anyMatch(st -> st.getTag().getId().equals(groupId));
                if (!hasTag) continue;
            }

            Optional<Evaluation> evalOpt = evaluationRepository.findLatestBySubmissionId(s.getId());
            String evalStatus = evalOpt.map(Evaluation::getStatus).orElse(s.getStatus());
            BigDecimal score = evalOpt.map(Evaluation::getScore).orElse(BigDecimal.ZERO);
            Boolean compileSuccess = evalOpt.map(Evaluation::getCompileSuccess).orElse(null);

            int testsPassed = 0;
            int totalTests = 0;
            if (evalOpt.isPresent()) {
                List<TestResult> trList = testResultRepository.findByEvaluationId(evalOpt.get().getId());
                totalTests = trList.size();
                testsPassed = (int) trList.stream().filter(tr -> "PASSED".equalsIgnoreCase(tr.getStatus())).count();
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                if (!status.equalsIgnoreCase(evalStatus) && !status.equalsIgnoreCase(s.getStatus())) {
                    continue;
                }
            }

            String studentName = s.getStudent().getFullName();
            String exTitle = s.getExerciseVersion() != null ? s.getExerciseVersion().getTitle() : "Ejercicio";
            String exSlug = s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null ?
                    s.getExerciseVersion().getExercise().getSlug() : "";

            if (searchLower != null && !searchLower.isBlank()) {
                boolean matchName = studentName != null && studentName.toLowerCase().contains(searchLower);
                boolean matchTitle = exTitle != null && exTitle.toLowerCase().contains(searchLower);
                boolean matchSlug = exSlug != null && exSlug.toLowerCase().contains(searchLower);
                if (!matchName && !matchTitle && !matchSlug) {
                    continue;
                }
            }

            UUID actId = s.getActivityVersion() != null && s.getActivityVersion().getActivity() != null ?
                    s.getActivityVersion().getActivity().getId() : null;
            String actName = s.getActivityVersion() != null && s.getActivityVersion().getActivity() != null ?
                    s.getActivityVersion().getActivity().getName() : "Práctica directa";
            UUID exId = s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null ?
                    s.getExerciseVersion().getExercise().getId() : null;

            items.add(new TeacherSubmissionItemDTO(
                    s.getId(),
                    s.getStudent().getId(),
                    studentName,
                    s.getStudent().getUsername(),
                    grpName,
                    actId,
                    actName,
                    exId,
                    exSlug,
                    exTitle,
                    s.getLanguage(),
                    s.getStatus(),
                    evalStatus,
                    score,
                    testsPassed,
                    totalTests,
                    compileSuccess,
                    s.getAttemptNumber(),
                    s.getCreatedAt()
            ));
        }

        return items;
    }

    @Transactional(readOnly = true)
    public TeacherSubmissionDetailDTO getTeacherSubmissionDetail(UUID submissionId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && teacher.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("Operación restringida a profesores");
        }

        Submission s = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        Optional<Evaluation> evalOpt = evaluationRepository.findLatestBySubmissionId(submissionId);
        EvaluationDTO evaluationDTO = null;

        if (evalOpt.isPresent()) {
            Evaluation eval = evalOpt.get();
            List<TestResult> trList = testResultRepository.findByEvaluationId(eval.getId());
            int privIdx = 1;
            List<TestResultDTO> dtos = new ArrayList<>();
            for (TestResult tr : trList) {
                dtos.add(TestResultDTO.fromEntity(tr, true, privIdx));
                if (!tr.isPublic()) privIdx++;
            }
            evaluationDTO = EvaluationDTO.fromEntity(eval, dtos);
        }

        String grpName = "General";
        List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(s.getStudent().getId(), s.getCreatedAt());
        for (StudentTag st : activeTags) {
            if ("group".equalsIgnoreCase(st.getTag().getCategory())) {
                grpName = st.getTag().getValue();
                break;
            }
        }
        if ("General".equals(grpName) && !activeTags.isEmpty()) {
            grpName = activeTags.get(0).getTag().getValue();
        }

        UUID actId = s.getActivityVersion() != null && s.getActivityVersion().getActivity() != null ?
                s.getActivityVersion().getActivity().getId() : null;
        String actName = s.getActivityVersion() != null && s.getActivityVersion().getActivity() != null ?
                s.getActivityVersion().getActivity().getName() : "Práctica directa";
        UUID exId = s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null ?
                s.getExerciseVersion().getExercise().getId() : null;
        String exSlug = s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null ?
                s.getExerciseVersion().getExercise().getSlug() : "";
        String exTitle = s.getExerciseVersion() != null ? s.getExerciseVersion().getTitle() : "Ejercicio";

        return new TeacherSubmissionDetailDTO(
                s.getId(),
                s.getStudent().getId(),
                s.getStudent().getFullName(),
                s.getStudent().getUsername(),
                grpName,
                actId,
                actName,
                exId,
                exSlug,
                exTitle,
                s.getLanguage(),
                s.getSourceCode(),
                s.getStatus(),
                s.getAttemptNumber(),
                s.getCreatedAt(),
                evaluationDTO
        );
    }
}
