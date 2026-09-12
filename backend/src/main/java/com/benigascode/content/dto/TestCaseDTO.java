package com.benigascode.content.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TestCaseDTO(
    String id,
    String name,
    boolean isPublic,
    int orderIndex,
    double weight,
    String input,
    String expected,
    String expectedOutput,
    String explanation
) {
    public TestCaseDTO(String id, String name, boolean isPublic, double weight, String input, String expected, String explanation) {
        this(id, name, isPublic, 0, weight, input, expected, expected, explanation);
    }

    public TestCaseDTO(String id, String name, boolean isPublic, int orderIndex, double weight, String input, String expected, String explanation) {
        this(id, name, isPublic, orderIndex, weight, input, expected, expected, explanation);
    }

    public String effectiveExpected() {
        if (expectedOutput != null && !expectedOutput.isBlank()) return expectedOutput;
        return expected != null ? expected : "";
    }
}

