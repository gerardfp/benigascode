package com.benigascode.evaluation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ClaimJobResponse(
    @JsonAlias("job_id") @JsonProperty("jobId") UUID jobId,
    @JsonAlias("submission_id") @JsonProperty("submissionId") UUID submissionId,
    @JsonAlias("source_code") @JsonProperty("sourceCode") String sourceCode,
    String language,
    @JsonAlias("compile_config") @JsonProperty("compileConfig") Map<String, Object> compileConfig,
    @JsonAlias("run_config") @JsonProperty("runConfig") Map<String, Object> runConfig,
    Map<String, Object> comparator,
    List<Map<String, Object>> tests
) {}
