package com.voicecommunicator.chat.controller;

import com.voicecommunicator.chat.dto.UnreadCountRequestDTO;
import com.voicecommunicator.chat.service.ReadStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat/read")
@RequiredArgsConstructor
public class ReadStateController {

    private final ReadStateService readStateService;

    @PostMapping("/{channelId}")
    public ResponseEntity<Void> markAsRead(@PathVariable String channelId,
                                           @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        readStateService.markChannelAsRead(userId, channelId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unread-counts")
    public ResponseEntity<Map<String, Long>> getUnreadCounts(@RequestBody UnreadCountRequestDTO request,
                                                             @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Map<String, Long> counts = readStateService.getUnreadCounts(userId, request.getChannelIds());
        return ResponseEntity.ok(counts);
    }
}