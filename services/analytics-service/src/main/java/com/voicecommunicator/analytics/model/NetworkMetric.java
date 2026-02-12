package com.voicecommunicator.analytics.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.TimeSeries;
import org.springframework.data.mongodb.core.timeseries.Granularity;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "network_metrics")
@TimeSeries(
        timeField = "timestamp",
        metaField = "metadata",
        granularity = Granularity.SECONDS
)
public class NetworkMetric {
    @Id
    private String id;
    private Instant timestamp;

    private Double rtt; // ping [ms]
    private Long packetsLost;
    private Double packetLossRatio; // [%]
    private Double jitter; // [ms]

    private MetricMetadata metadata;
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MetricMetadata {
        private String userId;
        private String serverId;
        private String roomId;
        private String connectionType;
    }

}
