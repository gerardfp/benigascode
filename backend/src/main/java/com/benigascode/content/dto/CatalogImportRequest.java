package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CatalogImportRequest(
    @NotBlank(message = "La URL del repositorio es obligatoria")
    String repositoryUrl,

    String branch,

    String rootPath,

    String authType,

    String authToken,

    @NotNull(message = "La estrategia ante conflictos es obligatoria")
    CatalogConflictStrategy conflictStrategy
) {
    public CatalogImportRequest {
        if (branch == null || branch.isBlank()) {
            branch = "main";
        }
        if (conflictStrategy == null) {
            conflictStrategy = CatalogConflictStrategy.OVERWRITE;
        }
    }
}

