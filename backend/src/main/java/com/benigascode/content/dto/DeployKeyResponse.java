package com.benigascode.content.dto;

public record DeployKeyResponse(
    String publicKey,
    String privateKey
) {}
