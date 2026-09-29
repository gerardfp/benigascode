package com.benigascode.learning.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MergeTagsRequest(
    @NotNull(message = "La etiqueta origen es requerida")
    UUID sourceTagId,

    @NotNull(message = "La etiqueta destino es requerida")
    UUID targetTagId
) {}
