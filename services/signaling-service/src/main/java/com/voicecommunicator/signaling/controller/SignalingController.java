package com.voicecommunicator.signaling.controller;

import com.voicecommunicator.signaling.model.SignalMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage message, Principal principal) {
        String senderId = principal.getName();
        String targetId = message.getTarget();

        message.setSender(senderId);

        log.info("Signal: {} from {} to {}", message.getType(), senderId, targetId);

        messagingTemplate.convertAndSendToUser(
                targetId,
                "/queue/signal",
                message
        );
    }
}