package com.voicecommunicator.chat.repository;

import com.voicecommunicator.chat.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findAllByOrderByTimestampDesc();
    List<Message> findByServerIdAndChannelIdOrderByTimestampAsc(String serverId, String channelId);

    long countByChannelIdAndTimestampAfter(String channelId, Instant timestamp);

    void deleteAllByServerId(String serverId);
}