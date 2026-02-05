package com.voicecommunicator.chat.service;

import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final MessageRepository messageRepository;

    public Message saveMessage(String userId, String username, String serverId, String channelId, String content) {

        Message message = Message.builder()
                .senderId(userId)
                .senderUsername(username)
                .serverId(serverId)
                .channelId(channelId)
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();

        return messageRepository.save(message);
    }

    public List<Message> getChannelMessages(String serverId, String channelId) {
        return messageRepository.findByServerIdAndChannelIdOrderByTimestampAsc(serverId, channelId);
    }

    public String getDMChannelId(String userId1, String userId2) {
        if (userId1.compareTo(userId2) < 0) {
            return userId1 + "_" + userId2;
        } else {
            return userId2 + "_" + userId1;
        }
    }
}