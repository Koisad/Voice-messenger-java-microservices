package com.voicecommunicator.chat.service;

import com.voicecommunicator.chat.model.ReadState;
import com.voicecommunicator.chat.repository.MessageRepository;
import com.voicecommunicator.chat.repository.ReadStateRepository;
import com.voicecommunicator.common.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReadStateService {

    private final ReadStateRepository readStateRepository;
    private final MessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;

    public void markChannelAsRead(String userId, String channelId) {
        List<ReadState> states = readStateRepository.findByUserIdAndChannelId(userId, channelId);

        ReadState readState;
        if (states.isEmpty()) {
            readState = ReadState.builder()
                    .userId(userId)
                    .channelId(channelId)
                    .build();
        } else {
            states.sort((a, b) -> {
                Instant t1 = a.getLastReadAt() == null ? Instant.EPOCH : a.getLastReadAt();
                Instant t2 = b.getLastReadAt() == null ? Instant.EPOCH : b.getLastReadAt();
                return t2.compareTo(t1);
            });

            readState = states.getFirst();

            if (states.size() > 1) {
                for (int i = 1; i < states.size(); i++) {
                    try {
                        readStateRepository.delete(states.get(i));
                    } catch (Exception e) {
                        log.warn("Failed to delete duplicate ReadState: {}", e.getMessage());
                    }
                }
            }
        }

        readState.setLastReadAt(Instant.now());
        try {
            readStateRepository.save(readState);
        } catch (DuplicateKeyException e) {
            log.info("Duplicate key during save, likely race condition: {}", e.getMessage());
        }

        try {
            NotificationEvent event = new NotificationEvent(
                    "CHANNEL_READ",
                    Map.of("channelId", channelId));

            String routingKey = "user." + userId + ".read";
            rabbitTemplate.convertAndSend("amq.topic", routingKey, event);
        } catch (Exception e) {
            log.info("Failed to send read notification: {}", e.getMessage());
        }
    }

    public Map<String, Long> getUnreadCounts(String userId, List<String> channelIds) {
        if (channelIds == null || channelIds.isEmpty()) {
            return new HashMap<>();
        }

        List<ReadState> states = readStateRepository.findByUserIdAndChannelIdIn(userId, channelIds);

        Map<String, Instant> readMap = new HashMap<>();
        for (ReadState state : states) {
            readMap.merge(state.getChannelId(),
                    state.getLastReadAt() != null ? state.getLastReadAt() : Instant.EPOCH,
                    (existing, replacement) -> existing.isAfter(replacement) ? existing : replacement);
        }

        Map<String, Long> unreadCounts = new HashMap<>();

        for (String channelId : channelIds) {
            Instant lastRead = readMap.getOrDefault(channelId, Instant.EPOCH);

            long count = messageRepository.countByChannelIdAndTimestampAfter(channelId, lastRead);

            if (count > 0) {
                unreadCounts.put(channelId, count);
            }
        }

        return unreadCounts;
    }
}