package com.voicecommunicator.room.service;

import com.voicecommunicator.common.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyFriendRequest(String senderId, String senderName, String receiverId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_REQUEST",
                Map.of("senderId", senderId, "senderName", senderName)
        );

        String destination = "/topic/user." + receiverId;
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send invite notification to user: {}", receiverId);
    }

    public void notifyFriendAccepted(String acceptingUserId, String acceptingUserName, String originalSenderId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_ACCEPTED",
                Map.of("friendId", acceptingUserId, "friendName", acceptingUserName)
        );

        String destination = "/topic/user." + originalSenderId;
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send accept notification to user: {}", originalSenderId);
    }

    public void notifyFriendRemoved(String userId, String removedFriendId) {
        NotificationEvent event = new NotificationEvent(
                "FRIEND_REMOVED",
                Map.of("friendId", removedFriendId)
        );

        String destination = "/topic/user." + userId;
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send remove notification to user: {} regarding friend: {}", userId, removedFriendId);
    }
}