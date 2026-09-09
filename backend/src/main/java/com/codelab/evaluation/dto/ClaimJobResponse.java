package com.codelab.evaluation.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ClaimJobResponse(
    UUID jobId,
    UUID submissionId,
    String sourceCode,
    String language,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> comparator,
    List<Map<String, Object>> tests
) {}

