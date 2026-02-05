package com.voicecommunicator.room.service;

import com.voicecommunicator.common.event.NotificationEvent;
import com.voicecommunicator.room.dto.MemberDTO;
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
}
