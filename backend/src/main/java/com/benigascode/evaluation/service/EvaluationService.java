package com.benigascode.evaluation.service;

import com.benigascode.activities.domain.ActivityVersion;
import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.evaluation.domain.EvaluationJob;
import com.benigascode.evaluation.domain.TestResult;
import com.benigascode.evaluation.dto.ClaimJobResponse;
import com.benigascode.evaluation.dto.EvaluationDTO;
import com.benigascode.evaluation.dto.RunnerJobResultRequest;
import com.benigascode.evaluation.dto.TestResultDTO;
import com.benigascode.evaluation.repository.EvaluationJobRepository;
import com.benigascode.evaluation.repository.EvaluationRepository;
import com.benigascode.evaluation.repository.TestResultRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.submissions.repository.AttemptLedgerRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.benigascode.submissions.service.StudentProgressService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class EvaluationService {

    private static final Logger log = LoggerFactory.getLogger(EvaluationService.class);

    public static final String PLATFORM_ACTUAL_RUNTIME = "java-26";
    public static final String PLATFORM_RUNTIME_IMAGE = "benigascode-sandbox-java26:latest";
    public static final String PLATFORM_RUNTIME_IMAGE_DIGEST = "sha256:e5b0a876436e5d1c8ff84dfd091cb530b83a9ed4273317d24acb673695bb7e0c";
    public static final String PLATFORM_ACTUAL_PYTHON_RUNTIME = "python-314";
    public static final String PLATFORM_PYTHON_RUNTIME_IMAGE = "benigascode-sandbox-python:latest";
    public static final String PLATFORM_PYTHON_RUNTIME_IMAGE_DIGEST = "sha256:60e78c7fdab21ed76e15f4a3b9d056564c147b936c021";
    public static final String EVALUATOR_VERSION = "1.0.0";

    private final EvaluationJobRepository evaluationJobRepository;
    private final EvaluationRepository evaluationRepository;
    private final TestResultRepository testResultRepository;
    private final SubmissionRepository submissionRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final StudentProgressService studentProgressService;
    private final ObjectMapper objectMapper;

    public EvaluationService(EvaluationJobRepository evaluationJobRepository,
                             EvaluationRepository evaluationRepository,
                             TestResultRepository testResultRepository,
                             SubmissionRepository submissionRepository,
                             AttemptLedgerRepository attemptLedgerRepository,
                             TeachingSpaceRepository teachingSpaceRepository,
                             StudentProgressService studentProgressService,
                             ObjectMapper objectMapper) {
        this.evaluationJobRepository = evaluationJobRepository;
        this.evaluationRepository = evaluationRepository;
        this.testResultRepository = testResultRepository;
        this.submissionRepository = submissionRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.studentProgressService = studentProgressService;
        this.objectMapper = objectMapper;
    }

    public static boolean isRuntimeCompatible(String requiredRuntime, String platformRuntime) {
        if (requiredRuntime == null || platformRuntime == null) return true;
        try {
            int req = Integer.parseInt(requiredRuntime.replaceAll("\\D+", ""));
            int plat = Integer.parseInt(platformRuntime.replaceAll("\\D+", ""));
            return req <= plat;
        } catch (Exception e) {
            return true;
        }
    }

    @Transactional
    public Optional<ClaimJobResponse> claimNextJob(String workerId) {
        Optional<EvaluationJob> jobOpt = evaluationJobRepository.claimNextJobNative();
        if (jobOpt.isEmpty()) {
            return Optional.empty();
        }

        EvaluationJob job = jobOpt.get();
        job.setStatus("CLAIMED");
        job.setWorkerId(workerId);
        job.setLeaseUntil(Instant.now().plus(45, ChronoUnit.SECONDS));
        job.setAttempts(job.getAttempts() + 1);
        job = evaluationJobRepository.save(job);

        Submission sub = job.getSubmission();
        sub.setStatus("EVALUATING");
        submissionRepository.save(sub);

        ExerciseVersion exVer = sub.getExerciseVersion();
        boolean isPython = "python".equalsIgnoreCase(sub.getLanguage());

        // Validar compatibilidad de runtime (required_runtime <= PLATFORM_ACTUAL_RUNTIME) si es Java
        if (!isPython && !isRuntimeCompatible(exVer.getRuntimeId(), PLATFORM_ACTUAL_RUNTIME)) {
            log.error("Incompatibilidad de runtime para job {}: ejercicio requiere {} > plataforma {}",
                    job.getId(), exVer.getRuntimeId(), PLATFORM_ACTUAL_RUNTIME);
            job.setStatus("FAILED");
            evaluationJobRepository.save(job);
            return Optional.empty();
        }

        try {
            Map<String, Object> compileConfig = objectMapper.readValue(exVer.getCompileConfig(), new TypeReference<>() {});
            Map<String, Object> runConfig = objectMapper.readValue(exVer.getRunConfig(), new TypeReference<>() {});
            Map<String, Object> comparatorConfig = objectMapper.readValue(exVer.getComparatorConfig(), new TypeReference<>() {});

            if (isPython) {
                String cmd = (String) compileConfig.get("command");
                if (cmd == null || cmd.contains("javac")) {
                    compileConfig.put("command", "python3 -m py_compile solution.py");
                }
                String runCmd = (String) runConfig.get("command");
                if (runCmd == null || runCmd.contains("java ")) {
                    runConfig.put("command", "python3 solution.py");
                }
            }

            Map<String, Object> testsRoot = objectMapper.readValue(exVer.getTestsConfig(), new TypeReference<>() {});
            List<Map<String, Object>> publicTests = (List<Map<String, Object>>) testsRoot.getOrDefault("public", List.of());
            List<Map<String, Object>> privateTests = (List<Map<String, Object>>) testsRoot.getOrDefault("private", List.of());

            List<Map<String, Object>> allTests = new ArrayList<>();
            allTests.addAll(publicTests);
            allTests.addAll(privateTests);

            return Optional.of(new ClaimJobResponse(
                    job.getId(),
                    sub.getId(),
                    sub.getSourceCode(),
                    sub.getLanguage(),
                    compileConfig,
                    runConfig,
                    comparatorConfig,
                    allTests
            ));
        } catch (Exception e) {
            log.error("Error al preparar paquete de trabajo para job " + job.getId(), e);
            job.setStatus("FAILED");
            evaluationJobRepository.save(job);
            return Optional.empty();
        }
    }

    @Transactional
    public void heartbeat(UUID jobId) {
        evaluationJobRepository.findById(jobId).ifPresent(job -> {
            if ("CLAIMED".equals(job.getStatus())) {
                job.setLeaseUntil(Instant.now().plus(45, ChronoUnit.SECONDS));
                evaluationJobRepository.save(job);
            }
        });
    }

    @Transactional
    public void recordJobResult(UUID jobId, RunnerJobResultRequest result) {
        EvaluationJob job = evaluationJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Trabajo no encontrado"));

        // Idempotencia: no procesar dos veces el mismo resultado
        if ("FINISHED".equals(job.getStatus())) {
            log.warn("Ignorando resultado duplicado para job ya finalizado: {}", jobId);
            return;
        }

        Submission submission = job.getSubmission();
        ExerciseVersion exerciseVersion = submission.getExerciseVersion();
        ActivityVersion activityVersion = submission.getActivityVersion();

        boolean isPython = "python".equalsIgnoreCase(submission.getLanguage());
        String actualRuntime = isPython ? PLATFORM_ACTUAL_PYTHON_RUNTIME : PLATFORM_ACTUAL_RUNTIME;
        String runtimeDigest = isPython ? PLATFORM_PYTHON_RUNTIME_IMAGE_DIGEST : PLATFORM_RUNTIME_IMAGE_DIGEST;

        Evaluation evaluation = new Evaluation();
        evaluation.setSubmission(submission);
        evaluation.setExerciseVersion(exerciseVersion);
        evaluation.setActivityVersion(activityVersion);
        evaluation.setRuntimeId(isPython ? PLATFORM_ACTUAL_PYTHON_RUNTIME : exerciseVersion.getRuntimeId());
        evaluation.setActualRuntime(actualRuntime);
        evaluation.setRuntimeImageDigest(runtimeDigest);
        evaluation.setEvaluatorVersion(EVALUATOR_VERSION);
        evaluation.setStatus(result.status());
        evaluation.setScore(result.score() != null ? result.score() : BigDecimal.ZERO);
        evaluation.setReason(job.getAttempts() > 1 ? "RETRY_RESULT" : "JOB_RESULT");
        evaluation.setStartedAt(job.getCreatedAt());
        evaluation.setFinishedAt(Instant.now());

        if (result.compile() != null) {
            evaluation.setCompileSuccess(result.compile().success());
            evaluation.setCompileStdout(result.compile().stdout());
            evaluation.setCompileStderr(result.compile().stderr());
        } else if ("COMPILE_ERROR".equalsIgnoreCase(result.status())) {
            evaluation.setCompileSuccess(false);
        } else {
            evaluation.setCompileSuccess(true);
        }

        evaluation = evaluationRepository.save(evaluation);

        // Si fue un fallo del sistema / infraestructura, devolver el intento al alumno
        if ("SYSTEM_ERROR".equalsIgnoreCase(result.status())) {
            log.error("Error del sistema en evaluación de submission {}. Procediendo a reembolso de intento.", submission.getId());
            attemptLedgerRepository.findBySubmissionId(submission.getId()).ifPresent(attempt -> {
                attempt.setStatus("REFUNDED");
                attemptLedgerRepository.save(attempt);
            });
        }

        if (result.testResults() != null) {
            for (RunnerJobResultRequest.RunnerTestResult tr : result.testResults()) {
                TestResult testResult = new TestResult();
                testResult.setEvaluation(evaluation);
                testResult.setTestId(tr.testId());
                testResult.setPublic(tr.isPublic());
                testResult.setStatus(tr.status());
                testResult.setDurationMs(tr.durationMs());
                // No almacenar la salida exacta de cada test en el histórico: solo cantidad de tests superados vs total y estado
                testResult.setStdout(null);
                testResult.setStderr(null);
                testResult.setExpectedOutput(null);
                testResult.setActualOutput(null);
                testResult.setScore(tr.score() != null ? tr.score() : BigDecimal.ZERO);
                testResultRepository.save(testResult);
            }
        }

        submission.setStatus("FINISHED");
        submissionRepository.save(submission);

        job.setStatus("FINISHED");
        evaluationJobRepository.save(job);

        // Actualizar seguimiento del progreso del alumno
        studentProgressService.updateProgress(submission, evaluation);
    }

    @Transactional
    public EvaluationDTO reevaluate(UUID submissionId, String reason, User teacher) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        if (submission.getActivityVersion() != null && submission.getActivityVersion().getActivity() != null) {
            UUID spaceId = submission.getActivityVersion().getActivity().getTeachingSpace().getId();
            if (teacher.getRole() != Role.ADMIN && !teachingSpaceRepository.isTeacherOfSpace(spaceId, teacher.getId())) {
                throw new AccessDeniedException("No tienes permisos de profesor en este espacio docente");
            }
        } else {
            if (teacher.getRole() != Role.ADMIN && teacher.getRole() != Role.TEACHER) {
                throw new AccessDeniedException("No tienes permisos de profesor para reevaluar esta entrega");
            }
        }

        // Crear nuevo trabajo de evaluación con alta prioridad
        EvaluationJob job = evaluationJobRepository.findBySubmissionId(submissionId)
                .orElseGet(() -> new EvaluationJob(submission));

        job.setStatus("QUEUED");
        job.setPriority(10); // Alta prioridad para reevaluaciones
        job.setWorkerId(null);
        job.setLeaseUntil(null);
        evaluationJobRepository.save(job);

        submission.setStatus("QUEUED");
        submissionRepository.save(submission);

        Evaluation latest = evaluationRepository.findLatestBySubmissionId(submissionId).orElse(null);
        if (latest == null) {
            return null;
        }

        List<TestResult> testResults = testResultRepository.findByEvaluationId(latest.getId());
        int privateIndex = 1;
        List<TestResultDTO> dtos = new ArrayList<>();
        for (TestResult tr : testResults) {
            dtos.add(TestResultDTO.fromEntity(tr, true, privateIndex));
            if (!tr.isPublic()) privateIndex++;
        }

        return EvaluationDTO.fromEntity(latest, dtos);
    }

    @Transactional(readOnly = true)
    public List<EvaluationDTO> getEvaluationsForSubmission(UUID submissionId, User user) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        boolean isTeacherOrAdmin = (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN);

        if (!isTeacherOrAdmin && !submission.getStudent().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Entrega no encontrada");
        }

        List<Evaluation> evals = evaluationRepository.findBySubmissionIdOrderByCreatedAtDesc(submissionId);
        List<EvaluationDTO> dtos = new ArrayList<>();

        for (Evaluation eval : evals) {
            List<TestResult> testResults = testResultRepository.findByEvaluationId(eval.getId());
            int privateIndex = 1;
            List<TestResultDTO> testResultDTOs = new ArrayList<>();
            for (TestResult tr : testResults) {
                testResultDTOs.add(TestResultDTO.fromEntity(tr, isTeacherOrAdmin, privateIndex));
                if (!tr.isPublic()) {
                    privateIndex++;
                }
            }
            dtos.add(EvaluationDTO.fromEntity(eval, testResultDTOs));
        }

        return dtos;
    }

    @Transactional(readOnly = true)
    public EvaluationDTO getLatestEvaluationForExercise(UUID exerciseId, User user) {
        List<Submission> subs = submissionRepository.findByStudentAndExercise(user.getId(), exerciseId);
        if (subs.isEmpty()) {
            return null;
        }
        for (Submission sub : subs) {
            List<EvaluationDTO> evals = getEvaluationsForSubmission(sub.getId(), user);
            if (!evals.isEmpty()) {
                return evals.get(0);
            }
        }
        return null;
    }
}
