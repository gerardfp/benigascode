package com.benigascode.identity.dto;

import java.util.List;
import java.util.UUID;

public record BulkCreateStudentResponse(
    List<CreatedStudentItem> created,
    List<String> errors
) {
    public record CreatedStudentItem(
        UUID id,
        String fullName,
        String username,
        String password,
        boolean generatedUsername,
        boolean generatedPassword
    ) {}
}

