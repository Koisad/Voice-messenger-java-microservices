package com.voicecommunicator.user.dto;

import lombok.Data;

@Data
public class FriendRequestDTO {
    private String addresseeId;
    private String addresseeUsername;
}