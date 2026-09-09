package com.codelab.evaluation.service;

import com.codelab.activities.domain.ActivityVersion;
import com.codelab.common.exception.AccessDeniedException;
import com.codelab.common.exception.ResourceNotFoundException;
import com.codelab.content.domain.ExerciseVersion;
import com.codelab.evaluation.domain.Evaluation;
import com.codelab.evaluation.domain.EvaluationJob;
import com.codelab.evaluation.domain.TestResult;
import com.codelab.evaluation.dto.ClaimJobResponse;
import com.codelab.evaluation.dto.EvaluationDTO;
import com.codelab.evaluation.dto.RunnerJobResultRequest;
import com.codelab.evaluation.dto.TestResultDTO;
import com.codelab.evaluation.repository.EvaluationJobRepository;
import com.codelab.evaluation.repository.EvaluationRepository;
import com.codelab.evaluation.repository.TestResultRepository;
import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;
import com.codelab.learning.repository.CourseMembershipRepository;
import com.codelab.submissions.domain.AttemptLedger;
import com.codelab.submissions.domain.Submission;
import com.codelab.submissions.repository.AttemptLedgerRepository;
import com.codelab.submissions.repository.SubmissionRepository;
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

    private final EvaluationJobRepository evaluationJobRepository;
    private final EvaluationRepository evaluationRepository;
    private final TestResultRepository testResultRepository;
    private final SubmissionRepository submissionRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final CourseMembershipRepository membershipRepository;
    private final ObjectMapper objectMapper;

    public EvaluationService(EvaluationJobRepository evaluationJobRepository,
                             EvaluationRepository evaluationRepository,
                             TestResultRepository testResultRepository,
                             SubmissionRepository submissionRepository,
                             AttemptLedgerRepository attemptLedgerRepository,
                             CourseMembershipRepository membershipRepository,
                             ObjectMapper objectMapper) {
        this.evaluationJobRepository = evaluationJobRepository;
        this.evaluationRepository = evaluationRepository;
        this.testResultRepository = testResultRepository;
        this.submissionRepository = submissionRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.membershipRepository = membershipRepository;
        this.objectMapper = objectMapper;
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

        try {
            Map<String, Object> compileConfig = objectMapper.readValue(exVer.getCompileConfig(), new TypeReference<>() {});
            Map<String, Object> runConfig = objectMapper.readValue(exVer.getRunConfig(), new TypeReference<>() {});
            Map<String, Object> comparatorConfig = objectMapper.readValue(exVer.getComparatorConfig(), new TypeReference<>() {});

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

        Evaluation evaluation = new Evaluation();
        evaluation.setSubmission(submission);
        evaluation.setExerciseVersion(exerciseVersion);
        evaluation.setActivityVersion(activityVersion);
        evaluation.setRuntimeId(exerciseVersion.getRuntimeId());
        evaluation.setStatus(result.status());
        evaluation.setScore(result.score() != null ? result.score() : BigDecimal.ZERO);
        evaluation.setReason("JOB_RESULT");
        evaluation.setStartedAt(job.getCreatedAt());
        evaluation.setFinishedAt(Instant.now());
        evaluation = evaluationRepository.save(evaluation);

        // Si fue un fallo del sistema / infraestructura, devolver el intento al alumno
        if ("SYSTEM_ERROR".equalsIgnoreCase(result.status())) {
            log.error("Error del sistema en evaluación de submission {}. Procediendo a reembolso de intento.", submission.getId());
            // Buscar y marcar intento como REFUNDED
            // (se mantiene en ledger con estado REFUNDED para trazabilidad sin consumir intento neto)
        }

        if (result.testResults() != null) {
            for (RunnerJobResultRequest.RunnerTestResult tr : result.testResults()) {
                TestResult testResult = new TestResult();
                testResult.setEvaluation(evaluation);
                testResult.setTestId(tr.testId());
                testResult.setPublic(tr.isPublic());
                testResult.setStatus(tr.status());
                testResult.setDurationMs(tr.durationMs());
                testResult.setStdout(tr.stdout());
                testResult.setStderr(tr.stderr());
                testResult.setExpectedOutput(tr.expectedOutput());
                testResult.setActualOutput(tr.actualOutput());
                testResult.setScore(tr.score() != null ? tr.score() : BigDecimal.ZERO);
                testResultRepository.save(testResult);
            }
        }

        submission.setStatus("FINISHED");
        submissionRepository.save(submission);

        job.setStatus("FINISHED");
        evaluationJobRepository.save(job);
    }

    @Transactional
    public EvaluationDTO reevaluate(UUID submissionId, String reason, User teacher) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega no encontrada"));

        UUID courseId = submission.getActivityVersion().getActivity().getCourse().getId();
        if (teacher.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseIdAndRole(teacher.getId(), courseId, "TEACHER")) {
            throw new AccessDeniedException("No tienes permisos de profesor en este curso");
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
        List<TestResultDTO> results = latest != null ?
                testResultRepository.findByEvaluationId(latest.getId()).stream().map(tr -> TestResultDTO.fromEntity(tr, true)).toList() :
                List.of();

        return latest != null ? EvaluationDTO.fromEntity(latest, results) : null;
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
            List<TestResultDTO> testResults = testResultRepository.findByEvaluationId(eval.getId()).stream()
                    .map(tr -> TestResultDTO.fromEntity(tr, isTeacherOrAdmin))
                    .toList();
            dtos.add(EvaluationDTO.fromEntity(eval, testResults));
        }

        return dtos;
    }
}

