package com.voicecommunicator.chat.dto;

import lombok.Data;
import java.util.List;

@Data
public class UnreadCountRequestDTO {
    private List<String> channelIds;
}