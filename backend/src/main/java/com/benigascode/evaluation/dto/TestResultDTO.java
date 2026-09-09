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
    public static TestResultDTO fromEntity(TestResult tr, boolean isTeacherOrAdmin) {
        String exp = (tr.isPublic() || isTeacherOrAdmin) ? tr.getExpectedOutput() : "[PROTEGIDO - TEST PRIVADO]";
        String act = (tr.isPublic() || isTeacherOrAdmin) ? tr.getActualOutput() : "[PROTEGIDO - TEST PRIVADO]";
        String out = (tr.isPublic() || isTeacherOrAdmin) ? tr.getStdout() : "";

        return new TestResultDTO(
            tr.getId(),
            tr.getTestId(),
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

