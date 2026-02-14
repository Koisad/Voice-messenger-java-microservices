package com.voicecommunicator.chat.repository;

import com.voicecommunicator.chat.model.ReadState;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReadStateRepository extends MongoRepository<ReadState, String> {
    List<ReadState> findByUserIdAndChannelId(String userId, String channelId);
    List<ReadState> findByUserIdAndChannelIdIn(String userId, List<String> channelIds);
}