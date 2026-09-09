package com.benigascode.content.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkGitRepoRequest(
    @NotBlank String name,
    @NotBlank String repositoryUrl,
    String branch,
    String rootPath,
    @NotBlank String authType,
    String authToken,
    String publicKey,
    String privateKey
) {}
