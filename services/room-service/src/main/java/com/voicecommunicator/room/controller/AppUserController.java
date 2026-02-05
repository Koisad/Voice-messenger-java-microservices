package com.voicecommunicator.room.controller;

import com.voicecommunicator.room.model.AppUser;
import com.voicecommunicator.room.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserService appUserService;

    @PostMapping("/sync")
    public ResponseEntity<Void> syncUser(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");
        appUserService.syncUser(userId, username);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<AppUser>> search(@RequestParam String query) {
        return ResponseEntity.ok(appUserService.searchUsers(query));
    }
}