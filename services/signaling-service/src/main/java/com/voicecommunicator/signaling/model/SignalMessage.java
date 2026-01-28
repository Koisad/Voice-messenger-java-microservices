package com.voicecommunicator.signaling.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {
    private String type;
    private String sender;
    private String target;
    private Object data;      // WebRTC data
}