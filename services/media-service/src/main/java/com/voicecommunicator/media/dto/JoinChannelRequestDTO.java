package com.voicecommunicator.media.dto;

import lombok.Data;

@Data
public class JoinChannelRequestDTO {
    private String channelId;
    private String displayName;
}