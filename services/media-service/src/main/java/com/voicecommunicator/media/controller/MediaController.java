package com.voicecommunicator.media.controller;

import com.voicecommunicator.media.service.LiveKitTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final LiveKitTokenService tokenService;

    @Value("${livekit.external-url:ws://localhost:7880}")
    private String liveKitUrl;

    @PostMapping("/join-channel")
    public ResponseEntity<Map<String, String>> joinChannel(
            @RequestParam String channelId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        String liveKitToken = tokenService.createToken(userId, channelId);

        return ResponseEntity.ok(Map.of(
                "token", liveKitToken,
                "url", liveKitUrl
        ));
    }
}