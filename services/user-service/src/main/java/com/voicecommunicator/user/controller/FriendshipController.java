package com.voicecommunicator.user.controller;

import com.voicecommunicator.user.dto.FriendRequestDTO;
import com.voicecommunicator.user.dto.FriendshipResponseDTO;
import com.voicecommunicator.user.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/friendships")
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/request")
    public ResponseEntity<Void> sendRequest(@RequestBody FriendRequestDTO request, @AuthenticationPrincipal Jwt jwt) {

        String requesterId = jwt.getSubject();
        String requesterUsername = jwt.getClaimAsString("preferred_username");

        friendshipService.sendFriendshipRequest(requesterId, requesterUsername, request.getAddresseeId(), request.getAddresseeUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/accept/{requestId}")
    public ResponseEntity<Void> acceptRequest(@PathVariable String requestId, @AuthenticationPrincipal Jwt jwt) {
        String addreseeId = jwt.getSubject();
        friendshipService.acceptFriendshipRequest(addreseeId, requestId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/requests")
    public ResponseEntity<List<FriendshipResponseDTO>> getFriendshipRequests(@AuthenticationPrincipal Jwt jwt) {
        String addresseeId = jwt.getSubject();
        return ResponseEntity.ok(friendshipService.getFriendshipRequests(addresseeId));
    }

    @GetMapping
    public ResponseEntity<List<FriendshipResponseDTO>> getFriends(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ResponseEntity.ok(friendshipService.getFriends(userId));
    }

    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> deleteFriendship(@PathVariable String friendId, @AuthenticationPrincipal Jwt jwt) {

        String userId = jwt.getSubject();
        friendshipService.removeFriendship(userId, friendId);

        return ResponseEntity.ok().build();
    }

}
