package com.benigascode.content.api;

import com.benigascode.content.domain.GitRepository;
import com.benigascode.content.repository.GitRepositoryRepository;
import com.benigascode.content.service.GitOperationsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/webhooks/github")
public class GitHubWebhookController {

    private static final Logger log = LoggerFactory.getLogger(GitHubWebhookController.class);

    private final GitRepositoryRepository gitRepositoryRepository;
    private final GitOperationsService gitOperationsService;
    private final ObjectMapper objectMapper;

    public GitHubWebhookController(GitRepositoryRepository gitRepositoryRepository,
                                   GitOperationsService gitOperationsService,
                                   ObjectMapper objectMapper) {
        this.gitRepositoryRepository = gitRepositoryRepository;
        this.gitOperationsService = gitOperationsService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/content-sync")
    public ResponseEntity<String> handlePushWebhook(@RequestBody String payload,
                                                    @RequestHeader(value = "X-GitHub-Event", defaultValue = "push") String event) {
        if (!"push".equalsIgnoreCase(event)) {
            return ResponseEntity.ok("Ignorado evento no-push: " + event);
        }

        try {
            JsonNode root = objectMapper.readTree(payload);
            String cloneUrl = root.has("repository") && root.get("repository").has("clone_url")
                ? root.get("repository").get("clone_url").asText() : null;

            if (cloneUrl == null) {
                return ResponseEntity.badRequest().body("No repository clone_url in payload");
            }

            Optional<GitRepository> repoOpt = gitRepositoryRepository.findByRepositoryUrl(cloneUrl);
            if (repoOpt.isEmpty()) {
                // Probar con sufijo .git o sin él
                String altUrl = cloneUrl.endsWith(".git") ? cloneUrl.substring(0, cloneUrl.length() - 4) : cloneUrl + ".git";
                repoOpt = gitRepositoryRepository.findByRepositoryUrl(altUrl);
            }

            if (repoOpt.isPresent()) {
                GitRepository repo = repoOpt.get();
                log.info("Webhook recibido para repositorio {}, disparando sincronización...", repo.getName());
                CompletableFuture.runAsync(() -> {
                    try {
                        gitOperationsService.cloneOrPullAndSync(repo);
                    } catch (Exception e) {
                        log.error("Error en sincronización disparada por webhook", e);
                    }
                });
                return ResponseEntity.ok("Sincronización iniciada");
            } else {
                return ResponseEntity.ok("Repositorio no registrado en Benigascode");
            }
        } catch (Exception e) {
            log.error("Error procesando GitHub webhook", e);
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
