package com.voicecommunicator.chat.controller;

import com.voicecommunicator.chat.dto.GetMessagesRequestDTO;
import com.voicecommunicator.chat.dto.SendMessageRequestDTO;
import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.service.ChatService;
import com.voicecommunicator.chat.service.ChatNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/chat")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final ChatNotificationService chatNotificationService;

    // WebSocket
    @MessageMapping("/send/{serverId}/{channelId}")
    public void sendMessage(@DestinationVariable String serverId,
                            @DestinationVariable String channelId,
                            @Payload SendMessageRequestDTO request,
                            Principal principal) {

        Message savedMessage = chatService.saveMessage(
                principal.getName(),
                request.getUsername(),
                serverId,
                channelId,
                request.getContent()
        );

        String destination = String.format("/topic/server.%s.channel.%s", serverId, channelId);
        messagingTemplate.convertAndSend(destination, savedMessage);

        chatNotificationService.notifyRecipients(savedMessage);
    }

    // REST
    @GetMapping("/history")
    public ResponseEntity<List<Message>> getMessages(GetMessagesRequestDTO request) {

        return ResponseEntity.ok(chatService.getChannelMessages(
                request.getServerId(),
                request.getChannelId()));
    }

    @PostMapping("/dm/{addresseeId}")
    public ResponseEntity<Map<String, String>> getDMChannel(
            @PathVariable String addresseeId,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = jwt.getSubject();
        String channelId = chatService.getDMChannelId(userId, addresseeId);

        return ResponseEntity.ok(Map.of("channelId", channelId));
    }
}