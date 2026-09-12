package com.benigascode.evaluation.dto;

import com.benigascode.evaluation.domain.TestResult;
import java.math.BigDecimal;
import java.util.UUID;

public record TestResultDTO(
    UUID id,
    String testId,
    boolean isPublic,
    String status,
    int durationMs,
    String stdout,
    String expectedOutput,
    String actualOutput,
    BigDecimal score
) {
    public static TestResultDTO fromEntity(TestResult tr, boolean isTeacherOrAdmin, int privateIndex) {
        boolean canSeeDetails = tr.isPublic() || isTeacherOrAdmin;
        String displayTestId = tr.isPublic() ? tr.getTestId() : (isTeacherOrAdmin ? tr.getTestId() : "Test Privado " + privateIndex);
        String exp = canSeeDetails ? tr.getExpectedOutput() : null;
        String act = canSeeDetails ? tr.getActualOutput() : null;
        String out = canSeeDetails ? tr.getStdout() : null;

        return new TestResultDTO(
            tr.getId(),
            displayTestId,
            tr.isPublic(),
            tr.getStatus(),
            tr.getDurationMs(),
            out,
            exp,
            act,
            tr.getScore()
        );
    }
}
