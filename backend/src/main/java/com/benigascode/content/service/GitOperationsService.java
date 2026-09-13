package com.benigascode.content.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.ContentSync;
import com.benigascode.content.domain.GitRepository;
import com.benigascode.content.repository.GitRepositoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

@Service
public class GitOperationsService {

    private static final Logger log = LoggerFactory.getLogger(GitOperationsService.class);

    @Value("${benigascode.content.repos-path:/var/lib/benigascode/repos}")
    private String reposBasePath;

    private final GitRepositoryRepository gitRepositoryRepository;
    private final ContentSyncService contentSyncService;

    public GitOperationsService(GitRepositoryRepository gitRepositoryRepository,
                                ContentSyncService contentSyncService) {
        this.gitRepositoryRepository = gitRepositoryRepository;
        this.contentSyncService = contentSyncService;
    }

    @PostConstruct
    public void init() {
        try {
            runProcess(List.of("git", "config", "--global", "--add", "safe.directory", "*"), new File("/tmp"), Map.of());
            log.info("Configurado git safe.directory=* correctamente");
        } catch (Exception ex) {
            log.warn("No se pudo configurar safe.directory en git", ex);
        }
    }


    public ContentSync cloneOrPullAndSync(GitRepository repo) {
        repo.setLastSyncStatus("IN_PROGRESS");
        repo.setLastSyncError(null);
        gitRepositoryRepository.save(repo);

        File reposBase = new File(reposBasePath);
        if (!reposBase.exists()) {
            reposBase.mkdirs();
        }

        File repoDir = new File(reposBase, repo.getId().toString());
        Path tempKeyFile = null;

        try {
            Map<String, String> env = new HashMap<>();

            // Configurar autenticación según el tipo
            String effectiveUrl = repo.getRepositoryUrl();
            if ("OAUTH_TOKEN".equalsIgnoreCase(repo.getAuthType()) && repo.getAuthToken() != null && !repo.getAuthToken().isBlank()) {
                effectiveUrl = formatOAuthCloneUrl(repo.getRepositoryUrl(), repo.getAuthToken());
            } else if ("DEPLOY_KEY".equalsIgnoreCase(repo.getAuthType()) && repo.getPrivateKey() != null && !repo.getPrivateKey().isBlank()) {
                tempKeyFile = Files.createTempFile("git_key_", ".pem");
                Files.writeString(tempKeyFile, repo.getPrivateKey());
                tempKeyFile.toFile().setReadable(false, false);
                tempKeyFile.toFile().setReadable(true, true);
                env.put("GIT_SSH_COMMAND", "ssh -i " + tempKeyFile.toAbsolutePath() + " -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null");
            }

            if (!repoDir.exists()) {
                // Clonar repositorio
                log.info("Clonando repositorio {} en {}", repo.getName(), repoDir.getAbsolutePath());
                List<String> cloneCmd = List.of(
                    "git", "clone",
                    "--branch", (repo.getBranch() != null && !repo.getBranch().isBlank()) ? repo.getBranch() : "main",
                    effectiveUrl,
                    repoDir.getAbsolutePath()
                );
                runProcess(cloneCmd, reposBase, env);
            } else {
                // Pull del repositorio existente
                log.info("Actualizando repositorio {} en {}", repo.getName(), repoDir.getAbsolutePath());
                List<String> fetchCmd = List.of("git", "fetch", "origin", repo.getBranch());
                runProcess(fetchCmd, repoDir, env);

                List<String> resetCmd = List.of("git", "reset", "--hard", "origin/" + repo.getBranch());
                runProcess(resetCmd, repoDir, env);
            }

            // Obtener commit SHA actual
            String commitSha = runProcess(List.of("git", "rev-parse", "HEAD"), repoDir, env).trim();

            // Localizar directorio raíz dentro del repo
            File syncDir = repoDir;
            if (repo.getRootPath() != null && !repo.getRootPath().trim().isEmpty() && !"/".equals(repo.getRootPath().trim())) {
                String subPath = repo.getRootPath().trim();
                if (subPath.startsWith("/")) {
                    subPath = subPath.substring(1);
                }
                syncDir = new File(repoDir, subPath);
            }

            if (!syncDir.exists() || !syncDir.isDirectory()) {
                throw new ValidationException("La subcarpeta raíz '" + repo.getRootPath() + "' no existe dentro del repositorio clonado.");
            }

            // Ejecutar la sincronización con ContentSyncService
            log.info("Sincronizando contenidos desde {} con commit {}", syncDir.getAbsolutePath(), commitSha);
            ContentSync syncResult = contentSyncService.syncFromDirectory(syncDir.getAbsolutePath(), commitSha);

            repo.setLastCommit(commitSha);
            repo.setLastSyncAt(Instant.now());
            repo.setLastSyncStatus("SUCCESS");
            repo.setLastSyncError(null);
            gitRepositoryRepository.save(repo);

            return syncResult;
        } catch (Exception e) {
            log.error("Error al sincronizar repositorio git", e);
            repo.setLastSyncAt(Instant.now());
            repo.setLastSyncStatus("FAILED");
            repo.setLastSyncError(e.getMessage());
            gitRepositoryRepository.save(repo);
            throw new ValidationException("Fallo en sincronización git: " + e.getMessage());
        } finally {
            if (tempKeyFile != null) {
                try {
                    Files.deleteIfExists(tempKeyFile);
                } catch (Exception ignored) {}
            }
        }
    }

    public File cloneToTemp(String repoUrl, String branch, String authType, String authToken, String privateKey) throws Exception {
        Path tempDir = Files.createTempDirectory("benigas_git_");
        File destDir = tempDir.toFile();

        Map<String, String> env = new HashMap<>();
        String effectiveUrl = repoUrl;
        Path tempKeyFile = null;

        try {
            if ("OAUTH_TOKEN".equalsIgnoreCase(authType) || (authToken != null && !authToken.isBlank())) {
                effectiveUrl = formatOAuthCloneUrl(repoUrl, authToken);
            } else if ("DEPLOY_KEY".equalsIgnoreCase(authType) && privateKey != null && !privateKey.isBlank()) {
                tempKeyFile = Files.createTempFile("git_key_", ".pem");
                Files.writeString(tempKeyFile, privateKey);
                tempKeyFile.toFile().setReadable(false, false);
                tempKeyFile.toFile().setReadable(true, true);
                env.put("GIT_SSH_COMMAND", "ssh -i " + tempKeyFile.toAbsolutePath() + " -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null");
            }

            String targetBranch = (branch != null && !branch.isBlank()) ? branch : "main";

            try {
                List<String> cloneCmd = List.of(
                    "git", "clone",
                    "--branch", targetBranch,
                    effectiveUrl,
                    destDir.getAbsolutePath()
                );
                runProcess(cloneCmd, destDir.getParentFile(), env);
            } catch (Exception ex) {
                log.info("No se pudo clonar la rama {} directamente, intentando clon general o inicialización: {}", targetBranch, ex.getMessage());
                if (destDir.exists()) {
                    deleteRecursively(destDir);
                }
                destDir.mkdirs();

                try {
                    List<String> genericClone = List.of("git", "clone", effectiveUrl, destDir.getAbsolutePath());
                    runProcess(genericClone, destDir.getParentFile(), env);
                    runProcess(List.of("git", "checkout", "-B", targetBranch), destDir, env);
                } catch (Exception ex2) {
                    log.info("Repositorio remoto parece estar vacío o inaccesible, inicializando repo local: {}", ex2.getMessage());
                    if (destDir.exists()) {
                        deleteRecursively(destDir);
                    }
                    destDir.mkdirs();
                    runProcess(List.of("git", "init"), destDir, env);
                    runProcess(List.of("git", "remote", "add", "origin", effectiveUrl), destDir, env);
                    runProcess(List.of("git", "checkout", "-b", targetBranch), destDir, env);
                }
            }

            return destDir;
        } finally {
            if (tempKeyFile != null) {
                try {
                    Files.deleteIfExists(tempKeyFile);
                } catch (Exception ignored) {}
            }
        }
    }

    public String pushToRemote(File repoDir, String repoUrl, String branch, String authToken, String commitMessage, String authorName, String authorEmail) throws Exception {
        Map<String, String> env = new HashMap<>();
        String effectiveUrl = repoUrl;
        if (authToken != null && !authToken.isBlank()) {
            effectiveUrl = formatOAuthCloneUrl(repoUrl, authToken);
        }

        // Configurar autor
        if (authorName != null && !authorName.isBlank()) {
            runProcess(List.of("git", "config", "user.name", authorName), repoDir, env);
        } else {
            runProcess(List.of("git", "config", "user.name", "Benigascode"), repoDir, env);
        }

        if (authorEmail != null && !authorEmail.isBlank()) {
            runProcess(List.of("git", "config", "user.email", authorEmail), repoDir, env);
        } else {
            runProcess(List.of("git", "config", "user.email", "teacher@benigascode.local"), repoDir, env);
        }

        // Configurar remoto con credenciales
        runProcess(List.of("git", "remote", "set-url", "origin", effectiveUrl), repoDir, env);

        // Stage all changes
        runProcess(List.of("git", "add", "-A"), repoDir, env);

        // Check status
        String status = runProcess(List.of("git", "status", "--porcelain"), repoDir, env).trim();
        if (!status.isEmpty()) {
            String msg = (commitMessage != null && !commitMessage.isBlank())
                    ? commitMessage
                    : "Export catalog from Benigascode - " + Instant.now();
            runProcess(List.of("git", "commit", "-m", msg), repoDir, env);
        }

        // Push
        String targetBranch = (branch != null && !branch.isBlank()) ? branch : "main";
        runProcess(List.of("git", "push", "-u", "origin", targetBranch), repoDir, env);

        return runProcess(List.of("git", "rev-parse", "HEAD"), repoDir, env).trim();
    }

    public void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File c : children) {
                    deleteRecursively(c);
                }
            }
        }
        file.delete();
    }

    public String formatOAuthCloneUrl(String originalUrl, String token) {
        if (token == null || token.isBlank()) return originalUrl;
        String cleanUrl = originalUrl.trim();
        String user = token.startsWith("ghs_") ? "x-access-token" : "oauth2";
        if (cleanUrl.startsWith("https://")) {
            return "https://" + user + ":" + token + "@" + cleanUrl.substring("https://".length());
        }
        if (cleanUrl.startsWith("http://")) {
            return "http://" + user + ":" + token + "@" + cleanUrl.substring("http://".length());
        }
        return cleanUrl;
    }

    public String runProcess(List<String> command, File workingDir, Map<String, String> env) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDir);
        pb.environment().putAll(env);
        pb.redirectErrorStream(true);

        Process process = pb.start();
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Comando falló con código " + exitCode + ": " + output);
        }
        return output.toString();
    }
}
