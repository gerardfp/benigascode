package com.benigascode.identity.dto;

import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;

import java.util.UUID;

public record UserDTO(
    UUID id,
    String username,
    String fullName,
    Role role,
    String githubUsername,
    String avatarUrl
) {
    public static UserDTO fromEntity(User user) {
        return new UserDTO(
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getRole(),
            user.getGithubUsername(),
            user.getAvatarUrl()
        );
    }
}

