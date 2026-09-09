package com.codelab.content.dto;

public record PublicTestDTO(
    String id,
    String name,
    String input,
    String expectedOutput
) {}

