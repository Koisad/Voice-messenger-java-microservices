package com.voicecommunicator.chat.dto;

import lombok.Data;

@Data
public class SendMessageRequestDTO {
    private String senderId;
    private String content;
}