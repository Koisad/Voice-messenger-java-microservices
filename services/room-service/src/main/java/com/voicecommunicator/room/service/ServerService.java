package com.voicecommunicator.room.service;

import com.voicecommunicator.room.dto.MemberDTO;
import com.voicecommunicator.room.exception.ChannelNotFoundException;
import com.voicecommunicator.room.exception.MemberNotFoundException;
import com.voicecommunicator.room.exception.ServerNotFoundException;
import com.voicecommunicator.room.exception.ServerOwnerException;
import com.voicecommunicator.room.model.*;
import com.voicecommunicator.room.repository.MemberRepository;
import com.voicecommunicator.room.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServerService {

    private final MemberRepository memberRepository;
    private final ServerRepository serverRepository;
    private final RoomMemberNotificationService memberNotificationService;

    @Transactional
    public Server createServer(String name, String userId, String username) {
        Server server = new Server();
        server.setName(name);
        server.setOwnerId(userId);
        server.getChannels().add(new Channel(UUID.randomUUID().toString(), "general_text", ChannelType.TEXT));
        server.getChannels().add(new Channel(UUID.randomUUID().toString(), "general_voice", ChannelType.VOICE));
        Server savedServer = serverRepository.save(server);

        Member member = new Member();
        member.setServerId(savedServer.getId());
        member.setUserId(userId);
        member.setUsername(username);
        member.setRole(Role.OWNER);
        memberRepository.save(member);

        return savedServer;
    }

    public List<Server> getUserServers(String userId) {
        List<Member> membership = memberRepository.findByUserId(userId);

        List<String> serverIds = membership.stream()
                .map(Member::getServerId)
                .toList();

        return serverRepository.findAllById(serverIds);
    }

    public void joinServer(String serverId, String userId, String username) {
        if (!serverRepository.existsById(serverId)) {
            throw new ServerNotFoundException(serverId);
        }

        if (memberRepository.existsByServerIdAndUserId(serverId, userId)) {
            return;
        }

        Member member = new Member();
        member.setServerId(serverId);
        member.setUserId(userId);
        member.setUsername(username);
        member.setRole(Role.MEMBER);
        memberRepository.save(member);

        MemberDTO memberDTO = MemberDTO.builder()
                .userId(userId)
                .username(username)
                .role(Role.MEMBER)
                .build();
        memberNotificationService.notifyMemberJoined(serverId, memberDTO);
    }

    public void leaveServer(String serverId, String userId) {
        Member member = memberRepository.findByServerIdAndUserId(serverId, userId)
                .orElseThrow(() -> new MemberNotFoundException(userId));

        if (member.getRole() == Role.OWNER) {
            throw new ServerOwnerException(userId);
        }

        String username = member.getUsername();
        memberRepository.deleteByServerIdAndUserId(serverId, userId);

        memberNotificationService.notifyMemberLeft(serverId, userId, username);
    }

    public List<com.voicecommunicator.room.dto.MemberDTO> getServerMembers(String serverId) {
        if (!serverRepository.existsById(serverId)) {
            throw new ServerNotFoundException(serverId);
        }

        return memberRepository.findByServerId(serverId).stream()
                .map(member -> com.voicecommunicator.room.dto.MemberDTO.builder()
                        .userId(member.getUserId())
                        .username(member.getUsername())
                        .role(member.getRole())
                        .build())
                .toList();
    }

    @Transactional
    public Channel addChannel(String serverId, String channelName, ChannelType type, String userId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException(serverId));

        if(!server.getOwnerId().equals(userId)) {
            throw new SecurityException("Only the server owner can add channels");
        }

        Channel channel = new Channel(UUID.randomUUID().toString(), channelName, type);
        server.getChannels().add(channel);
        serverRepository.save(server);

        memberNotificationService.notifyChannelAdded(serverId, channel);

        return channel;
    }

    @Transactional
    public void removeChannel(String serverId, String channelId, String userId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException(serverId));

        if(!server.getOwnerId().equals(userId)) {
            throw new SecurityException("Only the server owner can remove channels");
        }

        boolean removed = server.getChannels().removeIf(channel -> channel.getId().equals(channelId));

        if(!removed) {
            throw new ChannelNotFoundException(channelId);
        }

        serverRepository.save(server);

        memberNotificationService.notifyChannelRemoved(serverId, channelId);
    }

    @Transactional
    public void removeMember(String serverId, String userIdToRemove, String requesterId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException(serverId));

        if(!server.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Only the server owner can remove members");
        }

        if (userIdToRemove.equals(requesterId)) {
            throw new IllegalArgumentException("You cannot remove yourself");
        }

        Member memberToRemove = memberRepository.findByServerIdAndUserId(serverId, userIdToRemove)
                .orElseThrow(() -> new MemberNotFoundException(userIdToRemove));

        memberRepository.delete(memberToRemove);
        memberNotificationService.notifyMemberLeft(serverId, userIdToRemove, memberToRemove.getUsername());
    }

}
