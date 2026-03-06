package com.voicecommunicator.user.controller;

import com.voicecommunicator.user.dto.RegisterRequestDTO;
import com.voicecommunicator.user.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestBody RegisterRequestDTO request) {
        authService.registerUser(request);
        return ResponseEntity.status(201).build();
    }
}