package com.benigascode.content.dto;

import java.util.List;
import java.util.Map;

public record GenerateTestOutputsRequest(
    String sourceCode,
    String language,
    List<TestCaseDTO> testCases,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig
) {}
