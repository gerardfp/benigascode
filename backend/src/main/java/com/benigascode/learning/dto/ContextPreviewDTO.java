package com.benigascode.learning.dto;

import com.benigascode.identity.dto.UserDTO;

import java.util.List;

public record ContextPreviewDTO(
    int matchingStudentsCount,
    List<UserDTO> matchingStudents
) {
}

