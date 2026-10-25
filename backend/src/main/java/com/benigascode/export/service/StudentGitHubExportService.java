package com.benigascode.export.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.dto.GitHubRepoDTO;
import com.benigascode.export.dto.StudentExportPushRequest;
import com.benigascode.export.dto.StudentExportResultDTO;
import com.benigascode.identity.domain.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
public class StudentGitHubExportService {

    private static final Logger log = LoggerFactory.getLogger(StudentGitHubExportService.class);

    private final StudentCatalogExportService catalogExportService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public StudentGitHubExportService(StudentCatalogExportService catalogExportService,
                                     ObjectMapper objectMapper) {
        this.catalogExportService = catalogExportService;
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
    }

    public List<GitHubRepoDTO> fetchUserRepositories(String token) {
        if (token == null || token.isBlank()) {
            throw new ValidationException("Se requiere un token de GitHub válido");
        }

        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("https://api.github.com/user/repos?per_page=100&sort=updated")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return objectMapper.readValue(response.getBody(), new TypeReference<List<GitHubRepoDTO>>() {});
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Error al obtener repositorios del usuario en GitHub", e);
            throw new ValidationException("Error al consultar repositorios de GitHub: " + e.getMessage());
        }
    }

    public StudentExportResultDTO exportToGitHub(User student, StudentExportPushRequest request) {
        String token = request.token();
        if (token == null || token.isBlank()) {
            throw new ValidationException("Se requiere un token de acceso de GitHub para exportar.");
        }

        // 1. Generar todos los archivos a exportar
        Map<String, String> files = catalogExportService.generateFiles(student);
        var preparedExercises = catalogExportService.collectPreparedExercises(student);
        int exercisesCount = preparedExercises.size();

        if (files.isEmpty() || exercisesCount == 0) {
            throw new ValidationException("No tienes ejercicios en colecciones empezadas para exportar.");
        }

        String owner;
        String repo;
        String htmlUrl;

        // 2. Crear repositorio nuevo o usar existente
        if (request.createNew()) {
            String repoName = request.repoName();
            if (repoName == null || repoName.isBlank()) {
                repoName = "mi-catalogo-benigascode";
            }
            repoName = repoName.trim().replaceAll("[^a-zA-Z0-9._-]", "-");

            Map<String, Object> createBody = Map.of(
                    "name", repoName,
                    "description", "Catálogo de ejercicios y soluciones exportado desde Benigascode",
                    "private", request.isPrivate(),
                    "auto_init", true
            );

            try {
                ResponseEntity<String> createRes = restClient.post()
                        .uri("https://api.github.com/user/repos")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(createBody)
                        .retrieve()
                        .toEntity(String.class);

                JsonNode root = objectMapper.readTree(createRes.getBody());
                owner = root.path("owner").path("login").asText();
                repo = root.path("name").asText();
                htmlUrl = root.path("html_url").asText();
            } catch (HttpClientErrorException.UnprocessableEntity e) {
                // Si el repositorio ya existe (422), consultar usuario y reusarlo
                owner = fetchUserLogin(token);
                repo = repoName;
                htmlUrl = "https://github.com/" + owner + "/" + repo;
            } catch (Exception e) {
                log.error("Error al crear repositorio en GitHub: {}", e.getMessage());
                throw new ValidationException("Error al crear repositorio en GitHub: " + e.getMessage());
            }
        } else {
            String targetFull = request.targetRepoFullName();
            if (targetFull == null || !targetFull.contains("/")) {
                throw new ValidationException("Nombre de repositorio destino inválido (formato esperado: usuario/repositorio).");
            }
            String[] parts = targetFull.split("/", 2);
            owner = parts[0].trim();
            repo = parts[1].trim();
            htmlUrl = "https://github.com/" + owner + "/" + repo;
        }

        // 3. Obtener rama por defecto y último commit base
        String defaultBranch = "main";
        String baseCommitSha = null;
        String baseTreeSha = null;

        try {
            ResponseEntity<String> repoInfoRes = restClient.get()
                    .uri("https://api.github.com/repos/" + owner + "/" + repo)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .retrieve()
                    .toEntity(String.class);

            if (repoInfoRes.getBody() != null) {
                JsonNode rNode = objectMapper.readTree(repoInfoRes.getBody());
                if (rNode.hasNonNull("default_branch")) {
                    defaultBranch = rNode.get("default_branch").asText();
                }
            }
        } catch (Exception ignored) {}

        try {
            ResponseEntity<String> refRes = restClient.get()
                    .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/ref/heads/" + defaultBranch)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .retrieve()
                    .toEntity(String.class);

            if (refRes.getBody() != null) {
                JsonNode refJson = objectMapper.readTree(refRes.getBody());
                baseCommitSha = refJson.path("object").path("sha").asText();

                if (baseCommitSha != null && !baseCommitSha.isBlank()) {
                    ResponseEntity<String> commitRes = restClient.get()
                            .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/commits/" + baseCommitSha)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                            .retrieve()
                            .toEntity(String.class);
                    if (commitRes.getBody() != null) {
                        JsonNode cJson = objectMapper.readTree(commitRes.getBody());
                        baseTreeSha = cJson.path("tree").path("sha").asText();
                    }
                }
            }
        } catch (Exception e) {
            log.info("No se encontró ref/heads/{} en {}/{}, se creará rama limpia", defaultBranch, owner, repo);
        }

        // 4. Crear Git Tree con todos los archivos
        String newTreeSha;
        try {
            List<Map<String, String>> treeItems = new ArrayList<>();
            for (Map.Entry<String, String> entry : files.entrySet()) {
                treeItems.add(Map.of(
                        "path", entry.getKey(),
                        "mode", "100644",
                        "type", "blob",
                        "content", entry.getValue()
                ));
            }

            Map<String, Object> treePayload = new HashMap<>();
            treePayload.put("tree", treeItems);
            if (baseTreeSha != null && !baseTreeSha.isBlank()) {
                treePayload.put("base_tree", baseTreeSha);
            }

            ResponseEntity<String> treeRes = restClient.post()
                    .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/trees")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(treePayload)
                    .retrieve()
                    .toEntity(String.class);

            JsonNode treeJson = objectMapper.readTree(treeRes.getBody());
            newTreeSha = treeJson.path("sha").asText();
        } catch (Exception e) {
            log.error("Fallo al crear Git Tree en GitHub: {}", e.getMessage());
            throw new ValidationException("Error al preparar archivos en GitHub: " + e.getMessage());
        }

        // 5. Crear Commit
        String newCommitSha;
        try {
            Map<String, Object> commitPayload = new HashMap<>();
            commitPayload.put("message", "Exportar catálogo de ejercicios de Benigascode (" + exercisesCount + " ejercicios)");
            commitPayload.put("tree", newTreeSha);
            if (baseCommitSha != null && !baseCommitSha.isBlank()) {
                commitPayload.put("parents", List.of(baseCommitSha));
            } else {
                commitPayload.put("parents", Collections.emptyList());
            }

            ResponseEntity<String> commitRes = restClient.post()
                    .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/commits")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(commitPayload)
                    .retrieve()
                    .toEntity(String.class);

            JsonNode commitJson = objectMapper.readTree(commitRes.getBody());
            newCommitSha = commitJson.path("sha").asText();
        } catch (Exception e) {
            log.error("Fallo al crear Git Commit en GitHub: {}", e.getMessage());
            throw new ValidationException("Error al confirmar cambios en GitHub: " + e.getMessage());
        }

        // 6. Actualizar o crear referencia de la rama
        try {
            if (baseCommitSha != null) {
                Map<String, Object> patchPayload = Map.of(
                        "sha", newCommitSha,
                        "force", true
                );
                restClient.patch()
                        .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/refs/heads/" + defaultBranch)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(patchPayload)
                        .retrieve()
                        .toBodilessEntity();
            } else {
                Map<String, Object> postRefPayload = Map.of(
                        "ref", "refs/heads/" + defaultBranch,
                        "sha", newCommitSha
                );
                restClient.post()
                        .uri("https://api.github.com/repos/" + owner + "/" + repo + "/git/refs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(postRefPayload)
                        .retrieve()
                        .toBodilessEntity();
            }
        } catch (Exception e) {
            log.error("Fallo al actualizar referencia en GitHub: {}", e.getMessage());
            throw new ValidationException("Error al actualizar la rama en GitHub: " + e.getMessage());
        }

        return new StudentExportResultDTO(
                true,
                htmlUrl,
                exercisesCount,
                files.size(),
                "¡Catálogo de ejercicios exportado con éxito a GitHub!"
        );
    }

    private String fetchUserLogin(String token) {
        try {
            ResponseEntity<String> res = restClient.get()
                    .uri("https://api.github.com/user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                    .retrieve()
                    .toEntity(String.class);
            if (res.getBody() != null) {
                JsonNode root = objectMapper.readTree(res.getBody());
                return root.path("login").asText();
            }
        } catch (Exception ignored) {}
        return "usuario";
    }
}
