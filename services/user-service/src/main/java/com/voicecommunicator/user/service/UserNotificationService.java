package com.voicecommunicator.user.service;

import com.voicecommunicator.common.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserNotificationService {

    private final RabbitTemplate rabbitTemplate;

    public void notifyFriendRequest(String senderId, String senderName, String receiverId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_REQUEST",
                Map.of("senderId", senderId, "senderName", senderName));

        String routingKey = "user." + receiverId;
        rabbitTemplate.convertAndSend("amq.topic", routingKey, event);
        log.info("Send invite notification to user: {} (key: {})", receiverId, routingKey);
    }

    public void notifyFriendAccepted(String acceptingUserId, String acceptingUserName, String originalSenderId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_ACCEPTED",
                Map.of("friendId", acceptingUserId, "friendName", acceptingUserName));

        String routingKey = "user." + originalSenderId;
        rabbitTemplate.convertAndSend("amq.topic", routingKey, event);
        log.info("Send accept notification to user: {} (key: {})", originalSenderId, routingKey);
    }

    public void notifyFriendRemoved(String userId, String removedFriendId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_REMOVED",
                Map.of("friendId", removedFriendId));

        String routingKey = "user." + userId;
        rabbitTemplate.convertAndSend("amq.topic", routingKey, event);
        log.info("Send remove notification to user: {} regarding friend: {} (key: {})", userId, removedFriendId,
                routingKey);
    }
}