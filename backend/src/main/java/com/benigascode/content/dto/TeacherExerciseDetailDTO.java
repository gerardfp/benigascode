package com.benigascode.content.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TeacherExerciseDetailDTO(
    UUID id,
    String slug,
    String title,
    String statement,
    String language,
    String runtimeId,
    int versionNumber,
    String starterCode,
    Map<String, Object> compileConfig,
    Map<String, Object> runConfig,
    Map<String, Object> scoringConfig,
    Map<String, Object> comparatorConfig,
    Map<String, String> templates,
    List<String> tags,
    List<TestCaseDTO> tests,
    List<TestCaseDTO> testCases,
    List<AssetDTO> assets,
    Instant updatedAt,
    boolean hasDraft,
    String draftMarkdown,
    Instant draftUpdatedAt
) {
    public TeacherExerciseDetailDTO(UUID id, String slug, String title, String statement, String language, String runtimeId,
                                  int versionNumber, String starterCode, Map<String, Object> compileConfig,
                                  Map<String, Object> runConfig, Map<String, Object> scoringConfig,
                                  Map<String, Object> comparatorConfig, Map<String, String> templates,
                                  List<String> tags, List<TestCaseDTO> tests, List<AssetDTO> assets, Instant updatedAt) {
        this(id, slug, title, statement, language, runtimeId, versionNumber, starterCode, compileConfig, runConfig,
             scoringConfig, comparatorConfig, templates, tags, tests, tests, assets, updatedAt, false, null, null);
    }

    public TeacherExerciseDetailDTO(UUID id, String slug, String title, String statement, String language, String runtimeId,
                                  int versionNumber, String starterCode, Map<String, Object> compileConfig,
                                  Map<String, Object> runConfig, Map<String, Object> scoringConfig,
                                  Map<String, Object> comparatorConfig, Map<String, String> templates,
                                  List<String> tags, List<TestCaseDTO> tests, List<AssetDTO> assets, Instant updatedAt,
                                  boolean hasDraft, String draftMarkdown, Instant draftUpdatedAt) {
        this(id, slug, title, statement, language, runtimeId, versionNumber, starterCode, compileConfig, runConfig,
             scoringConfig, comparatorConfig, templates, tags, tests, tests, assets, updatedAt, hasDraft, draftMarkdown, draftUpdatedAt);
    }
}
