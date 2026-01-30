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

    public Message saveMessage(String userId, String serverId, String channelId, String content) {

        Message message = Message.builder()
                .senderId(userId)
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
}