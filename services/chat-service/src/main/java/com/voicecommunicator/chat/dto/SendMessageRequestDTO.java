package com.voicecommunicator.chat.dto;

import lombok.Data;

@Data
public class SendMessageRequestDTO {
    private String serverId;
    private String channelId;
    private String content;
}