package com.benigascode.identity.dto;

public record BulkCreateStudentItem(
    String fullName,
    String username,
    String password
) {}

