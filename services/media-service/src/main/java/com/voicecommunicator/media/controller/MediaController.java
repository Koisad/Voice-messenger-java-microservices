package com.voicecommunicator.media.controller;

import com.voicecommunicator.media.dto.JoinChannelRequestDTO;
import com.voicecommunicator.media.dto.LiveKitTokenResponseDTO;
import com.voicecommunicator.media.service.LiveKitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final LiveKitService liveKitService;

    @PostMapping("/token")
    public ResponseEntity<LiveKitTokenResponseDTO> getToken(
            @RequestBody JoinChannelRequestDTO request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        String channelId = request.getChannelId();

        String token = liveKitService.generateToken(userId, channelId);

        String url = liveKitService.getLiveKitUrl();

        return ResponseEntity.ok(new LiveKitTokenResponseDTO(token, url));
    }
}