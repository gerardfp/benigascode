package com.benigascode.content.dto;

import java.util.List;
import java.util.Map;

public record ValidateSolutionsRequest(
    Map<String, String> solutions,
    List<TestCaseDTO> testCases,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> comparatorConfig
) {}
