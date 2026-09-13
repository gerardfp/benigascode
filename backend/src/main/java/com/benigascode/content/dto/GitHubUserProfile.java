package com.benigascode.content.dto;

public record GitHubUserProfile(
    String id,
    String login,
    String name,
    String email,
    String avatarUrl
) {}

