package com.voicecommunicator.analytics.repository;

import com.voicecommunicator.analytics.model.NetworkMetric;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface NetworkMetricRepository extends MongoRepository<NetworkMetric, String> {
    List<NetworkMetric> findByMetadataServerIdAndTimestampBetween(String serverId, Instant start, Instant end);
    List<NetworkMetric> findByMetadataUserIdAndTimestampBetween(String userId, Instant start, Instant end);
    List<NetworkMetric> findByMetadataRoomIdAndTimestampBetween(String roomId, Instant start, Instant end);
}
