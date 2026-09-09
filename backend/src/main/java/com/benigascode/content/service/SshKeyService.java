package com.benigascode.content.service;

import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.dto.DeployKeyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SshKeyService {

    private static final Logger log = LoggerFactory.getLogger(SshKeyService.class);

    public DeployKeyResponse generateDeployKey() {
        try {
            Path tempKey = Files.createTempFile("deploy_key_", "");
            File keyFile = tempKey.toFile();
            if (keyFile.exists()) {
                keyFile.delete();
            }

            ProcessBuilder pb = new ProcessBuilder(
                "ssh-keygen",
                "-t", "ed25519",
                "-N", "",
                "-C", "benigascode-deploy-key",
                "-f", keyFile.getAbsolutePath()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String error = new String(process.getInputStream().readAllBytes());
                log.error("Error ejecutando ssh-keygen: " + error);
                throw new ValidationException("No se pudo generar el par de claves SSH: " + error);
            }

            String privateKey = Files.readString(keyFile.toPath());
            Path pubKeyPath = Path.of(keyFile.getAbsolutePath() + ".pub");
            String publicKey = Files.readString(pubKeyPath).trim();

            Files.deleteIfExists(keyFile.toPath());
            Files.deleteIfExists(pubKeyPath);

            return new DeployKeyResponse(publicKey, privateKey);
        } catch (Exception e) {
            log.error("Fallo al generar clave SSH", e);
            throw new ValidationException("Error al generar clave SSH de despliegue: " + e.getMessage());
        }
    }
}
