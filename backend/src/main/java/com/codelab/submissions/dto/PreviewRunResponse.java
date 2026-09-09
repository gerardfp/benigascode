package com.codelab.submissions.dto;

import java.util.List;

public record PreviewRunResponse(
    boolean compileSuccess,
    String compileStdout,
    String compileStderr,
    List<PreviewTestResult> testResults
) {
    public record PreviewTestResult(
        String testId,
        String status, // PASSED, FAILED, TIMEOUT, RUNTIME_ERROR
        int durationMs,
        String stdout,
        String expectedOutput,
        boolean passed
    ) {}
}

