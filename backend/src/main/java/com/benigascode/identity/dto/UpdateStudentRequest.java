package com.benigascode.identity.dto;

public record UpdateStudentRequest(
        String fullName,
        String username,
        String password
) {}
