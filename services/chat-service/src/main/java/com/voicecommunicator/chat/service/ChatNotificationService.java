package com.voicecommunicator.chat.service;

import com.voicecommunicator.common.dto.MessageNotificationDTO;
import com.voicecommunicator.chat.model.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyRecipients(Message message) {
        if ("dm".equalsIgnoreCase(message.getServerId())) {
            handleDMNotification(message);
        } else {
            handleServerNotification(message);
        }
    }

    private void handleDMNotification(Message message) {
        String channelId = message.getChannelId();
        String senderId = message.getSenderId();

        String[] parts = channelId.split("_");
        if (parts.length != 2) {
            log.warn("Invalid DM channel format: {}", channelId);
            return;
        }

        String recipientId = parts[0].equals(senderId) ? parts[1] : parts[0];

        MessageNotificationDTO notification = MessageNotificationDTO.builder()
                .type(MessageNotificationDTO.NotificationType.DM_NOTIFICATION)
                .payload(message)
                .build();

        messagingTemplate.convertAndSend("/topic/user." + recipientId, notification);
    }

    private void handleServerNotification(Message message) {
        MessageNotificationDTO notification = MessageNotificationDTO.builder()
                .type(MessageNotificationDTO.NotificationType.CHANNEL_MESSAGE_NOTIFICATION)
                .payload(message)
                .build();

        messagingTemplate.convertAndSend("/topic/server." + message.getServerId() + ".notifications", notification);
    }
}