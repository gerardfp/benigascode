package com.codelab.evaluation.dto;

import jakarta.validation.constraints.NotBlank;

public record ReevaluateRequest(
    @NotBlank(message = "El motivo de reevaluación es obligatorio")
    String reason // TEST_CORRECTION, COMPARATOR_CORRECTION, RUNNER_CORRECTION, SCORING_CORRECTION, MANUAL
) {}

