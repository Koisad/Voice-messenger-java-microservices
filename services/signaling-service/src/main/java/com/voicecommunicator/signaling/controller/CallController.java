package com.voicecommunicator.signaling.controller;

import com.voicecommunicator.signaling.service.UserServiceClient;
import com.voicecommunicator.signaling.service.CallNotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallNotificationService notificationService;
    private final UserServiceClient userServiceClient;

    @PostMapping("/initiate")
    public ResponseEntity<Void> initiateCall(@AuthenticationPrincipal Jwt jwt, @RequestBody CallRequest request) {
        String callerId = jwt.getSubject();
        String token = jwt.getTokenValue();

        String callerName = userServiceClient.getUserDisplayName(callerId, token);

        if (callerName == null) callerName = jwt.getClaimAsString("preferred_username");
        if (callerName == null) callerName = "Unknown";

        notificationService.notifyIncomingCall(callerId, callerName, request.getReceiverId(), request.getRoomId());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class CallRequest {
        private String receiverId;
        private String roomId;
    }
}