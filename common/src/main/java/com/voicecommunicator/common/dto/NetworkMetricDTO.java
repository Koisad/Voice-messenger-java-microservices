package com.voicecommunicator.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NetworkMetricDTO implements Serializable {
    private String userId;
    private String serverId;
    private String roomId;

    private Double rtt; // ping
    private Long packetsLost;
    private Double packetLossRatio;
    private Double jitter;

    private String connectionType;
    private Long timestamp;
}
