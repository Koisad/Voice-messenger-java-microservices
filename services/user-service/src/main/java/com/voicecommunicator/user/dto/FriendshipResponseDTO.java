package com.voicecommunicator.user.dto;

import com.voicecommunicator.user.model.FriendshipStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendshipResponseDTO {
    private String id;
    private String friendId;
    private String friendUsername;
    private String friendDisplayName;
    private String friendAvatarUrl;
    private FriendshipStatus status;
    private boolean isIncoming;
}