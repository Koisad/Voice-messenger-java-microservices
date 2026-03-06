package com.voicecommunicator.user.dto;

import com.voicecommunicator.user.model.AppUser;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponseDTO {
    private String id;
    private String username;
    private String displayName;
    private String email;
    private String avatarUrl;

    public static UserResponseDTO fromEntity(AppUser user) {
        return UserResponseDTO.builder()
                .id(user.getUserId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}