package com.voicecommunicator.room.dto;

import com.voicecommunicator.room.model.ChannelType;
import lombok.Data;

@Data
public class AddChannelRequestDTO {
    private String channelName;
    private ChannelType type;
}
