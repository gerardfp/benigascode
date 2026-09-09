package com.benigascode.content.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubRepoDTO(
    Long id,
    String name,
    @JsonProperty("full_name") String fullName,
    @JsonProperty("html_url") String htmlUrl,
    @JsonProperty("clone_url") String cloneUrl,
    @JsonProperty("default_branch") String defaultBranch,
    @JsonProperty("private") boolean isPrivate,
    String description
) {}
