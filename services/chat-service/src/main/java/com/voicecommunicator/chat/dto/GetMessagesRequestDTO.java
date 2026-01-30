package com.voicecommunicator.chat.dto;

import lombok.Data;

@Data
public class GetMessagesRequestDTO {
    private String serverId;
    private String channelId;
}