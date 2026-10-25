package com.benigascode.export.api;

import com.benigascode.content.dto.GitHubRepoDTO;
import com.benigascode.content.service.GitHubOAuthService;
import com.benigascode.export.dto.StudentExportPushRequest;
import com.benigascode.export.dto.StudentExportResultDTO;
import com.benigascode.export.dto.StudentExportSummaryDTO;
import com.benigascode.export.service.StudentCatalogExportService;
import com.benigascode.export.service.StudentGitHubExportService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student/export")
@PreAuthorize("isAuthenticated()")
public class StudentExportController {

    private final StudentCatalogExportService catalogExportService;
    private final StudentGitHubExportService gitHubExportService;
    private final GitHubOAuthService gitHubOAuthService;
    private final UserService userService;

    public StudentExportController(StudentCatalogExportService catalogExportService,
                                   StudentGitHubExportService gitHubExportService,
                                   GitHubOAuthService gitHubOAuthService,
                                   UserService userService) {
        this.catalogExportService = catalogExportService;
        this.gitHubExportService = gitHubExportService;
        this.gitHubOAuthService = gitHubOAuthService;
        this.userService = userService;
    }

    /**
     * Devuelve el resumen de colecciones y ejercicios que se exportarán para el alumno autenticado.
     */
    @GetMapping("/summary")
    public ResponseEntity<StudentExportSummaryDTO> getSummary() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(catalogExportService.getExportSummary(student));
    }

    /**
     * Descarga el catálogo completo en formato ZIP.
     */
    @GetMapping(value = "/zip", produces = "application/zip")
    public ResponseEntity<byte[]> downloadZip() throws IOException {
        User student = userService.getCurrentUser();
        byte[] zipData = catalogExportService.generateZip(student);

        String filename = "catalogo-ejercicios-benigascode.zip";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipData);
    }

    /**
     * Genera la URL de autorización de GitHub con permisos de repositorio (scope repo).
     */
    @GetMapping("/github/auth-url")
    public ResponseEntity<Map<String, String>> getGitHubAuthUrl(@RequestParam(required = false) String redirectUri) {
        String url = gitHubOAuthService.buildExportAuthorizeUrl(redirectUri);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * Intercambia el código de GitHub OAuth por un token de acceso para exportación.
     */
    @PostMapping("/github/exchange-code")
    public ResponseEntity<Map<String, Object>> exchangeCode(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String redirectUri = body.get("redirectUri");
        Map<String, Object> tokenResult = gitHubOAuthService.exchangeCodeForToken(code, redirectUri);
        return ResponseEntity.ok(tokenResult);
    }

    /**
     * Lista los repositorios del usuario autenticado en GitHub con el token facilitado.
     */
    @GetMapping("/github/repos")
    public ResponseEntity<List<GitHubRepoDTO>> getGitHubRepos(@RequestParam String token) {
        List<GitHubRepoDTO> repos = gitHubExportService.fetchUserRepositories(token);
        return ResponseEntity.ok(repos);
    }

    /**
     * Exporta y sube todo el catálogo de ejercicios a un repositorio de GitHub (nuevo o existente).
     */
    @PostMapping("/github/push")
    public ResponseEntity<StudentExportResultDTO> pushToGitHub(@Valid @RequestBody StudentExportPushRequest request) {
        User student = userService.getCurrentUser();
        StudentExportResultDTO result = gitHubExportService.exportToGitHub(student, request);
        return ResponseEntity.ok(result);
    }
}
