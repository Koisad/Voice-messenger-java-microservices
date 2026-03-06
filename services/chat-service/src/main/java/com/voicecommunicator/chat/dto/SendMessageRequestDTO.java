package com.voicecommunicator.chat.dto;

import lombok.Data;

@Data
public class SendMessageRequestDTO {
    private String username;
    private String content;
}