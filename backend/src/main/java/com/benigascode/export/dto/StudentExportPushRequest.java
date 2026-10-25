package com.benigascode.export.dto;

import jakarta.validation.constraints.NotBlank;

public record StudentExportPushRequest(
    @NotBlank(message = "Se requiere el token de acceso de GitHub")
    String token,
    boolean createNew,
    String repoName,
    boolean isPrivate,
    String targetRepoFullName
) {}
