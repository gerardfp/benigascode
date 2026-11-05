package com.benigascode.submissions.dto;
import java.time.Instant;
import java.util.UUID;
public record PreviewActivityDTO(UUID studentId, UUID exerciseId, String exerciseTitle, Instant lastPreviewAt) {}
