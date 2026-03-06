package com.voicecommunicator.room.service;

import com.voicecommunicator.common.event.NotificationEvent;
import com.voicecommunicator.room.dto.MemberDTO;
import com.voicecommunicator.room.model.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomMemberNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyMemberJoined(String serverId, MemberDTO member) {
        NotificationEvent event = new NotificationEvent(
                "MEMBER_JOINED",
                Map.of("member", member));

        String destination = "/topic/server." + serverId + ".members";
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send member joined notification to server: {}, member: {}", serverId, member.getUsername());
    }

    public void notifyMemberLeft(String serverId, String userId, String username) {
        NotificationEvent event = new NotificationEvent(
                "MEMBER_LEFT",
                Map.of("userId", userId, "username", username));

        String destination = "/topic/server." + serverId + ".members";
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send member left notification to server: {}, member: {}", serverId, username);
    }

    public void notifyChannelAdded(String serverId, Channel channel) {
        NotificationEvent event = new NotificationEvent(
                "CHANNEL_ADDED",
                Map.of("channel", channel)
        );
        String destination = "/topic/server." + serverId + ".channels";
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send channel added notification to server: {}", serverId);
    }

    public void notifyChannelRemoved(String serverId, String channelId) {
        NotificationEvent event = new NotificationEvent(
                "CHANNEL_REMOVED",
                Map.of("channelId", channelId)
        );
        String destination = "/topic/server." + serverId + ".channels";
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send channel removed notification to server: {}", serverId);
    }

    public void notifyServerDeleted(String serverId) {
        NotificationEvent event = new NotificationEvent(
                "SERVER_DELETED",
                Map.of("serverId", serverId)
        );
        String destination = "/topic/server." + serverId;
        messagingTemplate.convertAndSend(destination, event);
        log.info("Send server deleted notification: {}", serverId);
    }
}
