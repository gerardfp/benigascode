package com.benigascode.content.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.dto.GitHubRepoDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class GitHubOAuthService {

    private static final Logger log = LoggerFactory.getLogger(GitHubOAuthService.class);

    @Value("${benigascode.github.client-id:}")
    private String clientId;

    @Value("${benigascode.github.client-secret:}")
    private String clientSecret;

    @Value("${benigascode.github.redirect-uri:http://localhost:3000/teacher/sync/github/callback}")
    private String redirectUri;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GitHubOAuthService(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    public String getClientId() {
        return clientId;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public String buildAuthorizeUrl() {
        if (!isConfigured()) {
            throw new ValidationException("GitHub OAuth no está configurado en el servidor (faltan client-id / client-secret).");
        }
        String scope = URLEncoder.encode("repo,read:user", StandardCharsets.UTF_8);
        String encodedRedirect = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        return "https://github.com/login/oauth/authorize?client_id=" + clientId + "&scope=" + scope + "&redirect_uri=" + encodedRedirect;
    }

    public Map<String, Object> exchangeCodeForToken(String code) {
        if (!isConfigured()) {
            throw new ValidationException("GitHub OAuth no está configurado en el servidor.");
        }

        try {
            Map<String, String> requestBody = Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "code", code,
                "redirect_uri", redirectUri
            );

            ResponseEntity<String> response = restClient.post()
                .uri("https://github.com/login/oauth/access_token")
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());
                if (json.has("error")) {
                    String errorDesc = json.has("error_description") ? json.get("error_description").asText() : json.get("error").asText();
                    throw new ValidationException("Error de GitHub: " + errorDesc);
                }
                String accessToken = json.get("access_token").asText();
                String tokenType = json.has("token_type") ? json.get("token_type").asText() : "bearer";
                return Map.of("accessToken", accessToken, "tokenType", tokenType);
            } else {
                throw new ValidationException("No se pudo intercambiar el código por token de acceso");
            }
        } catch (Exception e) {
            log.error("Fallo al intercambiar token GitHub OAuth", e);
            throw new ValidationException("Error en GitHub OAuth: " + e.getMessage());
        }
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
            log.error("Error al obtener repositorios de GitHub", e);
            throw new ValidationException("Error al consultar repositorios de GitHub: " + e.getMessage());
        }
    }
}
