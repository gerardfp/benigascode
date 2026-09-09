package com.codelab.identity.dto;

import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;

import java.util.UUID;

public record UserDTO(
    UUID id,
    String username,
    String fullName,
    Role role
) {
    public static UserDTO fromEntity(User user) {
        return new UserDTO(
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getRole()
        );
    }
}

