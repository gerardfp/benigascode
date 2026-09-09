package com.codelab.evaluation.api;

import com.codelab.common.exception.AccessDeniedException;
import com.codelab.evaluation.dto.ClaimJobResponse;
import com.codelab.evaluation.dto.RunnerJobResultRequest;
import com.codelab.evaluation.service.EvaluationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/runner")
public class RunnerApiController {

    private final EvaluationService evaluationService;

    @Value("${codelab.runner.token:dev_runner_token_secure_12345}")
    private String runnerToken;

    public RunnerApiController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    private void validateRunnerToken(String token) {
        if (token == null || !token.equals(runnerToken)) {
            throw new AccessDeniedException("Token de autenticación de runner inválido");
        }
    }

    @PostMapping("/jobs/claim")
    public ResponseEntity<ClaimJobResponse> claimJob(
            @RequestHeader(value = "X-Runner-Token", required = false) String token,
            @RequestBody(required = false) Map<String, String> body) {
        validateRunnerToken(token);
        String workerId = body != null ? body.getOrDefault("worker_id", "unknown-worker") : "unknown-worker";

        Optional<ClaimJobResponse> job = evaluationService.claimNextJob(workerId);
        return job.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/jobs/{id}/heartbeat")
    public ResponseEntity<Void> heartbeat(
            @RequestHeader(value = "X-Runner-Token", required = false) String token,
            @PathVariable UUID id) {
        validateRunnerToken(token);
        evaluationService.heartbeat(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/jobs/{id}/result")
    public ResponseEntity<Void> submitResult(
            @RequestHeader(value = "X-Runner-Token", required = false) String token,
            @PathVariable UUID id,
            @RequestBody RunnerJobResultRequest result) {
        validateRunnerToken(token);
        evaluationService.recordJobResult(id, result);
        return ResponseEntity.ok().build();
    }
}

