package com.voicecommunicator.chat.listener;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserSyncListener {

    private final SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = "chat.user-sync")
    public void handleUserUpdated(UserUpdatedEvent event) {
        log.info("Received user update event for: {}", event.getUsername());

        messagingTemplate.convertAndSend("/topic/public.user-updates", event);
    }
}
