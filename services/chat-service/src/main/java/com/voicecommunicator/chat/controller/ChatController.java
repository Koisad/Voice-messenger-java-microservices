package com.voicecommunicator.chat.controller;

import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
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
    public Message sendMessage(@RequestBody String content, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("sub");
        return chatService.saveMessage(userId, content);
    }

    @GetMapping("/history")
    public List<Message> getHistory() {
        return chatService.getMessageHistory();
    }
}