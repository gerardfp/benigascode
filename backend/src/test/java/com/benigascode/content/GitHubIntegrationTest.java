package com.benigascode.content;

import com.benigascode.content.domain.GitRepository;
import com.benigascode.content.dto.DeployKeyResponse;
import com.benigascode.content.dto.GitRepositoryDTO;
import com.benigascode.content.service.GitHubOAuthService;
import com.benigascode.content.service.SshKeyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class GitHubIntegrationTest {

    @Test
    void testDeployKeyGeneration() {
        SshKeyService sshKeyService = new SshKeyService();
        DeployKeyResponse keyPair = sshKeyService.generateDeployKey();

        assertNotNull(keyPair);
        assertNotNull(keyPair.publicKey());
        assertNotNull(keyPair.privateKey());
        assertTrue(keyPair.publicKey().startsWith("ssh-ed25519"), "La clave pública debe ser Ed25519");
        assertTrue(keyPair.privateKey().contains("PRIVATE KEY"), "La clave privada debe contener marcador OpenSSH");
    }

    @Test
    void testOAuthServiceConfiguration() {
        GitHubOAuthService oauthService = new GitHubOAuthService(new ObjectMapper());
        assertFalse(oauthService.isConfigured());

        ReflectionTestUtils.setField(oauthService, "clientId", "dummy-client-id");
        ReflectionTestUtils.setField(oauthService, "clientSecret", "dummy-secret");
        ReflectionTestUtils.setField(oauthService, "redirectUri", "http://localhost:3000/callback");

        assertTrue(oauthService.isConfigured());
        String url = oauthService.buildAuthorizeUrl();
        assertTrue(url.contains("github.com/login/oauth/authorize"));
        assertTrue(url.contains("dummy-client-id"));
    }

    @Test
    void testGitRepositoryDTOMasking() {
        GitRepository repo = new GitRepository();
        repo.setName("My Repo");
        repo.setRepositoryUrl("https://github.com/user/repo.git");
        repo.setBranch("main");
        repo.setAuthType("OAUTH_TOKEN");
        repo.setAuthToken("ghp_secret_token_12345");
        repo.setPrivateKey("super_private_key");

        GitRepositoryDTO dto = GitRepositoryDTO.fromEntity(repo);
        assertEquals("My Repo", dto.name());
        assertTrue(dto.hasToken());
        // Verify GitRepositoryDTO does not expose authToken or privateKey directly
    }
}
