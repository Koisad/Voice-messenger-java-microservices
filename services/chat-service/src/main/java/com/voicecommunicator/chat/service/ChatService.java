package com.voicecommunicator.chat.service;

import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final MessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public Message saveMessage(String userId, String username, String serverId, String channelId, String content) {

        Message message = Message.builder()
                .senderId(userId)
                .senderUsername(username)
                .serverId(serverId)
                .channelId(channelId)
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();

        Message savedMessage = messageRepository.save(message);

        try {
            Map<String, Object> payload = Map.of(
                    "messageId", savedMessage.getId(),
                    "content", savedMessage.getContent()
            );

            rabbitTemplate.convertAndSend("text.analyze", payload);
            log.info("Send message {} to analyse (AI)", savedMessage.getId());
        }
        catch (Exception e) {
            log.error("Could not send message {} to analyze", savedMessage.getId());
        }

        return savedMessage;
    }

    @RabbitListener(queues = "text.result")
    public void handleAnalysisResult(Map<String, Object> result) {
        try {
            String messageId = (String) result.get("messageId");
            Boolean isToxic = (Boolean) result.get("isToxic");

            if (Boolean.TRUE.equals(isToxic)) {
                log.info("AI: message {} is probably toxic", messageId);

                messageRepository.findById(messageId).ifPresent(message -> {
                    message.setToxic(true);
                    messageRepository.save(message);

                    String destination = "/topic/server." + message.getServerId() + ".channel." + message.getChannelId();
                    messagingTemplate.convertAndSend(destination, message);
                });
            }
        }
        catch (Exception e) {
            log.error("Could not analyze message");
        }
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