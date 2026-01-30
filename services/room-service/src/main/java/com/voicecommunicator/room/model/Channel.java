package com.voicecommunicator.room.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Channel {
    private String id = UUID.randomUUID().toString();
    private String name;
    private ChannelType type;
}
