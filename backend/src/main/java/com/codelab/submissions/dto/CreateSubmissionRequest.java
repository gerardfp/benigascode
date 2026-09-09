package com.codelab.submissions.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSubmissionRequest(
    @NotBlank(message = "El código fuente es obligatorio")
    String sourceCode,

    String language
) {}

