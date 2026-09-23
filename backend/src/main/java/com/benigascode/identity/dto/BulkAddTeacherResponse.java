package com.benigascode.identity.dto;

import java.util.List;

public record BulkAddTeacherResponse(
    List<AuthorizedTeacherDTO> added,
    List<String> skipped,
    List<String> errors
) {}
