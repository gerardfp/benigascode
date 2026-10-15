package com.benigascode.content.dto;

import java.util.List;

public record GenerateTestOutputsResponse(
    boolean success,
    String error,
    List<GeneratedOutputItem> outputs
) {
    public record GeneratedOutputItem(
        int orderIndex,
        String testId,
        String output,
        boolean success,
        String error
    ) {}
}
