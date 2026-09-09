package com.codelab.learning.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCourseRequest(
    @NotBlank(message = "El nombre del curso es obligatorio")
    String name,

    @NotBlank(message = "El código del curso es obligatorio")
    String code,

    @NotBlank(message = "El curso académico es obligatorio")
    String academicYear,

    String description
) {}

