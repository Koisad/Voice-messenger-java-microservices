package com.voicecommunicator.signaling.service;

import com.voicecommunicator.common.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CallNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyIncomingCall(String callerId, String callerName, String receiverId, String roomId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("callerId", callerId);
        payload.put("callerName", callerName);
        payload.put("roomId", roomId);
        payload.put("type", "AUDIO");

        NotificationEvent event = new NotificationEvent("CALL_INCOMING", payload);

        messagingTemplate.convertAndSendToUser(receiverId, "/queue/notifications", event);
        log.info("Call notification sent to {}", receiverId);
    }
}