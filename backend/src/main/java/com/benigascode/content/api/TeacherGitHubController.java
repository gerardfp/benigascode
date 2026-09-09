package com.benigascode.content.api;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.ContentSync;
import com.benigascode.content.domain.GitRepository;
import com.benigascode.content.dto.*;
import com.benigascode.content.repository.GitRepositoryRepository;
import com.benigascode.content.service.GitHubOAuthService;
import com.benigascode.content.service.GitOperationsService;
import com.benigascode.content.service.SshKeyService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/github")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherGitHubController {

    private final GitHubOAuthService oauthService;
    private final SshKeyService sshKeyService;
    private final GitOperationsService gitOperationsService;
    private final GitRepositoryRepository gitRepositoryRepository;
    private final UserService userService;

    public TeacherGitHubController(GitHubOAuthService oauthService,
                                   SshKeyService sshKeyService,
                                   GitOperationsService gitOperationsService,
                                   GitRepositoryRepository gitRepositoryRepository,
                                   UserService userService) {
        this.oauthService = oauthService;
        this.sshKeyService = sshKeyService;
        this.gitOperationsService = gitOperationsService;
        this.gitRepositoryRepository = gitRepositoryRepository;
        this.userService = userService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of(
            "oauthEnabled", oauthService.isConfigured(),
            "clientId", oauthService.getClientId() != null ? oauthService.getClientId() : "",
            "redirectUri", oauthService.getRedirectUri()
        ));
    }

    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, String>> getAuthUrl() {
        String url = oauthService.buildAuthorizeUrl();
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/exchange-code")
    public ResponseEntity<Map<String, Object>> exchangeCode(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        Map<String, Object> tokenResult = oauthService.exchangeCodeForToken(code);
        return ResponseEntity.ok(tokenResult);
    }

    @GetMapping("/repos")
    public ResponseEntity<List<GitHubRepoDTO>> getRepositories(@RequestParam String token) {
        List<GitHubRepoDTO> repos = oauthService.fetchUserRepositories(token);
        return ResponseEntity.ok(repos);
    }

    @PostMapping("/generate-deploy-key")
    public ResponseEntity<DeployKeyResponse> generateDeployKey() {
        DeployKeyResponse keyPair = sshKeyService.generateDeployKey();
        return ResponseEntity.ok(keyPair);
    }

    @GetMapping("/repository")
    public ResponseEntity<GitRepositoryDTO> getLinkedRepository() {
        User teacher = userService.getCurrentUser();
        return gitRepositoryRepository.findTopByCreatedByIdOrderByCreatedAtDesc(teacher.getId())
            .map(r -> ResponseEntity.ok(GitRepositoryDTO.fromEntity(r)))
            .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/link-repo")
    public ResponseEntity<GitRepositoryDTO> linkRepository(@Valid @RequestBody LinkGitRepoRequest request) {
        User teacher = userService.getCurrentUser();

        GitRepository repo = new GitRepository(
            request.name(),
            request.repositoryUrl(),
            request.branch(),
            request.rootPath(),
            request.authType(),
            teacher
        );

        if (request.authToken() != null && !request.authToken().isBlank()) {
            repo.setAuthToken(request.authToken().trim());
        }
        if (request.publicKey() != null && !request.publicKey().isBlank()) {
            repo.setPublicKey(request.publicKey().trim());
        }
        if (request.privateKey() != null && !request.privateKey().isBlank()) {
            repo.setPrivateKey(request.privateKey().trim());
        }

        repo = gitRepositoryRepository.save(repo);

        // Lanzar primera sincronización
        gitOperationsService.cloneOrPullAndSync(repo);

        return ResponseEntity.ok(GitRepositoryDTO.fromEntity(repo));
    }

    @PostMapping("/repository/{id}/sync")
    public ResponseEntity<ContentSync> triggerSync(@PathVariable UUID id) {
        GitRepository repo = gitRepositoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Repositorio Git no encontrado: " + id));

        ContentSync sync = gitOperationsService.cloneOrPullAndSync(repo);
        return ResponseEntity.ok(sync);
    }

    @DeleteMapping("/repository/{id}")
    public ResponseEntity<Void> unlinkRepository(@PathVariable UUID id) {
        GitRepository repo = gitRepositoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Repositorio Git no encontrado: " + id));
        gitRepositoryRepository.delete(repo);
        return ResponseEntity.noContent().build();
    }
}
