package com.voicecommunicator.chat.controller;

import com.voicecommunicator.chat.dto.GetMessagesRequestDTO;
import com.voicecommunicator.chat.dto.SendMessageRequestDTO;
import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/send")
    public ResponseEntity<Message> sendMessage(@RequestBody SendMessageRequestDTO request, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        return ResponseEntity.ok(chatService.saveMessage(
                userId,
                request.getServerId(),
                request.getChannelId(),
                request.getContent()
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Message>> getMessages(GetMessagesRequestDTO request) {

        return ResponseEntity.ok(chatService.getChannelMessages(
                request.getServerId(),
                request.getChannelId()
        ));
    }
}