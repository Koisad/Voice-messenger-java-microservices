package com.voicecommunicator.room.controller;

import com.voicecommunicator.room.dto.AddChannelRequestDTO;
import com.voicecommunicator.room.dto.CreateServerRequestDTO;
import com.voicecommunicator.room.model.Channel;
import com.voicecommunicator.room.model.Server;
import com.voicecommunicator.room.service.ServerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servers")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;

    @PostMapping
    public ResponseEntity<Server> createServer(@RequestBody CreateServerRequestDTO createServerRequestDTO,
                                               @AuthenticationPrincipal Jwt jwt) {

        String serverName = createServerRequestDTO.getName();
        String userId = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");

        return ResponseEntity.ok(serverService.createServer(serverName, userId, username));
    }

    @GetMapping
    public ResponseEntity<List<Server>> getUserServers(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        return ResponseEntity.ok(serverService.getUserServers(userId));
    }

    @PostMapping("/{serverId}/join")
    public ResponseEntity<Void> joinServer(@PathVariable String serverId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");
        serverService.joinServer(serverId, userId, username);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{serverId}/leave")
    public ResponseEntity<Void> leaveServer(@PathVariable String serverId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        serverService.leaveServer(serverId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{serverId}/members")
    public ResponseEntity<List<com.voicecommunicator.room.dto.MemberDTO>> getServerMembers(
            @PathVariable String serverId) {
        return ResponseEntity.ok(serverService.getServerMembers(serverId));
    }

    @PostMapping("/{serverId}/channels")
    public ResponseEntity<Channel> addChannel(@PathVariable String serverId, @RequestBody AddChannelRequestDTO request, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        return ResponseEntity.ok(serverService.addChannel(serverId, request.getChannelName(), request.getType(), userId));
    }

    @DeleteMapping("/{serverId}/channels/{channelId}")
    public ResponseEntity<Void> removeChannel(@PathVariable String serverId, @PathVariable String channelId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        serverService.removeChannel(serverId, channelId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{serverId}/members/{userIdToRemove}")
    public ResponseEntity<Void> removeMember(@PathVariable String serverId, @PathVariable String userIdToRemove, @AuthenticationPrincipal Jwt jwt) {
        String requesterId = jwt.getSubject();
        serverService.removeMember(serverId, userIdToRemove, requesterId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{serverId}")
    public ResponseEntity<Void> deleteServer(@PathVariable String serverId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        serverService.deleteServer(serverId, userId);
        return ResponseEntity.ok().build();
    }
}
