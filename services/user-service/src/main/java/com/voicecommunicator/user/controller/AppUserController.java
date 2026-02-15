package com.voicecommunicator.user.controller;

import com.voicecommunicator.user.dto.UserResponseDTO;
import com.voicecommunicator.user.model.AppUser;
import com.voicecommunicator.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserService appUserService;

    @PostMapping("/sync")
    public ResponseEntity<UserResponseDTO> syncUser(@AuthenticationPrincipal Jwt jwt) {
        AppUser user = appUserService.syncUserFromToken(jwt);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(user));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> getMe(@AuthenticationPrincipal Jwt jwt) {
        AppUser user = appUserService.syncUserFromToken(jwt);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(user));
    }

    @PatchMapping(value = "/me", consumes = {"multipart/form-data"})
    public ResponseEntity<UserResponseDTO> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String displayName,
            @RequestPart(required = false) MultipartFile avatar
    ) {
        AppUser updated = appUserService.updateProfile(jwt.getSubject(), displayName, avatar);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(updated));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponseDTO>> search(@RequestParam String query) {
        List<AppUser> users = appUserService.searchUsers(query);

        List<UserResponseDTO> dtos = users.stream()
                .map(UserResponseDTO::fromEntity)
                .toList();

        return ResponseEntity.ok(dtos);
    }
}
