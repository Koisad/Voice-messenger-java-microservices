package com.voicecommunicator.chat.controller;

import com.voicecommunicator.chat.dto.GetMessagesRequestDTO;
import com.voicecommunicator.chat.dto.SendMessageRequestDTO;
import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // WebSocket
    @MessageMapping("/send/{serverId}/{channelId}")
    public void sendMessage(@DestinationVariable String serverId,
                                                @DestinationVariable String channelId,
                                                @Payload SendMessageRequestDTO request) {

        log.info("WebSocket: Message on channel {} from {}", channelId, request.getSenderId());

        Message message = chatService.saveMessage(
                request.getSenderId(),
                serverId,
                channelId,
                request.getContent()
        );

        String dest = "/topic/server." + serverId + ".channel." + channelId;
        messagingTemplate.convertAndSend(dest, message);
    }

    // REST
    @GetMapping("/history")
    public ResponseEntity<List<Message>> getMessages(GetMessagesRequestDTO request) {

        return ResponseEntity.ok(chatService.getChannelMessages(
                request.getServerId(),
                request.getChannelId()
        ));
    }
}