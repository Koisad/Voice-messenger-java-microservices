package com.voicecommunicator.media.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LiveKitTokenResponseDTO {
    private String token;
    private String serverUrl;
}
