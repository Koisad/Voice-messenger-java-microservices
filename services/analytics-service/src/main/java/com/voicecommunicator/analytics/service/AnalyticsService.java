package com.voicecommunicator.analytics.service;

import com.voicecommunicator.analytics.model.NetworkMetric;
import com.voicecommunicator.analytics.repository.NetworkMetricRepository;
import dto.NetworkMetricDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {
    private final NetworkMetricRepository networkMetricRepository;

    private final List<NetworkMetric> buffer = new ArrayList<>();
    private static final int BATCH_SIZE = 100;

    public synchronized void processMetric(NetworkMetricDTO dto) {
        NetworkMetric.MetricMetadata metadata = new NetworkMetric.MetricMetadata(dto.getUserId(), dto.getServerId(), dto.getRoomId(), dto.getConnectionType());

        NetworkMetric metric = NetworkMetric.builder()
                .timestamp(dto.getTimestamp() != null ? Instant.ofEpochMilli(dto.getTimestamp()) : Instant.now())
                .rtt(dto.getRtt())
                .packetsLost(dto.getPacketsLost())
                .packetLossRatio(dto.getPacketLossRatio())
                .jitter(dto.getJitter())
                .metadata(metadata)
                .build();

        buffer.add(metric);

        if(buffer.size() >= BATCH_SIZE) {
            flushBuffer();
        }
    }

    @Scheduled(fixedRate = 5000)
    private synchronized void flushBuffer() {
        if (buffer.isEmpty()) {
            return;
        }

        log.info("Sending {} metrics to database", buffer.size());
        networkMetricRepository.saveAll(buffer);
        buffer.clear();
    }

    public List<NetworkMetric> getMetricsForServer(String serverId) {
        Instant now = Instant.now();
        Instant hourAgo = now.minusSeconds(3600);

        return networkMetricRepository.findByMetadataServerIdAndTimestampBetween(serverId, hourAgo, now);
    }

    public List<NetworkMetric> getMetricsForUser(String userId) {
        Instant now = Instant.now();
        Instant hourAgo = now.minusSeconds(3600);

        return networkMetricRepository.findByMetadataUserIdAndTimestampBetween(userId, hourAgo, now);
    }

    public List<NetworkMetric> getMetricsForRoom(String roomId) {
        Instant now = Instant.now();
        Instant hourAgo = now.minusSeconds(3600);

        return networkMetricRepository.findByMetadataRoomIdAndTimestampBetween(roomId, hourAgo, now);
    }
}
