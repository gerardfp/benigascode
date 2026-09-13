package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;

public record CatalogExportPushRequest(
    @NotBlank(message = "La URL del repositorio es obligatoria")
    String repositoryUrl,

    String branch,

    String rootPath,

    String authToken,

    String commitMessage
) {
    public CatalogExportPushRequest {
        if (branch == null || branch.isBlank()) {
            branch = "main";
        }
    }
}

