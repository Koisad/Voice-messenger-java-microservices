package com.voicecommunicator.room.service;

import com.voicecommunicator.common.event.ServerDeletedEvent;
import com.voicecommunicator.room.dto.MemberDTO;
import com.voicecommunicator.room.exception.*;
import com.voicecommunicator.room.model.*;
import com.voicecommunicator.room.repository.AppUserRepository;
import com.voicecommunicator.room.repository.MemberRepository;
import com.voicecommunicator.room.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServerService {

    private static final String DEFAULT_TEXT_CHANNEL = "general_text";
    private static final String DEFAULT_VOICE_CHANNEL = "general_voice";
    private static final String EXCHANGE_INTERNAL = "internal.exchange";
    private static final String ROUTING_KEY_SERVER_DELETED = "server.deleted";
    private static final String UNKNOWN_USER = "Unknown";

    private final MemberRepository memberRepository;
    private final ServerRepository serverRepository;
    private final RoomMemberNotificationService memberNotificationService;
    private final AppUserRepository appUserRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public Server createServer(String name, String userId) {
        log.info("Creating server '{}' for owner: {}", name, userId);

        Server server = new Server();
        server.setName(name);
        server.setOwnerId(userId);
        server.getChannels().add(new Channel(UUID.randomUUID().toString(), DEFAULT_TEXT_CHANNEL, ChannelType.TEXT));
        server.getChannels().add(new Channel(UUID.randomUUID().toString(), DEFAULT_VOICE_CHANNEL, ChannelType.VOICE));

        Server savedServer = serverRepository.save(server);

        Member member = Member.builder()
                .serverId(savedServer.getId())
                .userId(userId)
                .role(Role.OWNER)
                .build();
        memberRepository.save(member);

        return savedServer;
    }

    @Transactional(readOnly = true)
    public List<Server> getUserServers(String userId) {
        List<Member> membership = memberRepository.findByUserId(userId);
        List<String> serverIds = membership.stream()
                .map(Member::getServerId)
                .toList();

        return serverRepository.findAllById(serverIds);
    }

    @Transactional
    public void joinServer(String serverId, String userId) {
        if (!serverRepository.existsById(serverId)) {
            throw new ServerNotFoundException(serverId);
        }

        if (memberRepository.existsByServerIdAndUserId(serverId, userId)) {
            log.warn("User {} already in server {}", userId, serverId);
            return;
        }

        Member member = Member.builder()
                .serverId(serverId)
                .userId(userId)
                .role(Role.MEMBER)
                .build();
        memberRepository.save(member);

        AppUser user = appUserRepository.findById(userId).orElse(null);
        MemberDTO memberDTO = mapToMemberDTO(member, user);

        log.info("User {} joined server {}", userId, serverId);
        memberNotificationService.notifyMemberJoined(serverId, memberDTO);
    }

    @Transactional
    public void leaveServer(String serverId, String userId) {
        Member member = memberRepository.findByServerIdAndUserId(serverId, userId)
                .orElseThrow(() -> new MemberNotFoundException(userId));

        if (member.getRole() == Role.OWNER) {
            throw new ServerOwnerException(userId);
        }

        String username = getUsernameSafe(userId);

        memberRepository.deleteByServerIdAndUserId(serverId, userId);

        log.info("User {} left server {}", userId, serverId);
        memberNotificationService.notifyMemberLeft(serverId, userId, username);
    }

    @Transactional
    public List<MemberDTO> getServerMembers(String serverId) {
        if (!serverRepository.existsById(serverId)) {
            throw new ServerNotFoundException(serverId);
        }

        List<Member> members = memberRepository.findByServerId(serverId);

        List<String> userIds = members.stream()
                .map(Member::getUserId)
                .toList();

        Map<String, AppUser> userMap = appUserRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(AppUser::getUserId, Function.identity()));

        return members.stream()
                .map(member -> mapToMemberDTO(member, userMap.get(member.getUserId())))
                .toList();
    }

    @Transactional
    public Channel addChannel(String serverId, String channelName, ChannelType type, String userId) {
        Server server = getServerAndVerifyOwner(serverId, userId, "add channels");

        Channel channel = new Channel(UUID.randomUUID().toString(), channelName, type);
        server.getChannels().add(channel);
        serverRepository.save(server);

        log.info("Channel {} added to server {}", channelName, serverId);
        memberNotificationService.notifyChannelAdded(serverId, channel);

        return channel;
    }

    @Transactional
    public void removeChannel(String serverId, String channelId, String userId) {
        Server server = getServerAndVerifyOwner(serverId, userId, "remove channels");

        boolean removed = server.getChannels().removeIf(channel -> channel.getId().equals(channelId));
        if (!removed) {
            throw new ChannelNotFoundException(channelId);
        }

        serverRepository.save(server);

        log.info("Channel {} removed from server {}", channelId, serverId);
        memberNotificationService.notifyChannelRemoved(serverId, channelId);
    }

    @Transactional
    public void removeMember(String serverId, String userIdToRemove, String requesterId) {
        getServerAndVerifyOwner(serverId, requesterId, "remove members");

        if (userIdToRemove.equals(requesterId)) {
            throw new IllegalArgumentException("You cannot remove yourself");
        }

        Member memberToRemove = memberRepository.findByServerIdAndUserId(serverId, userIdToRemove)
                .orElseThrow(() -> new MemberNotFoundException(userIdToRemove));

        String username = getUsernameSafe(userIdToRemove);

        memberRepository.delete(memberToRemove);
        memberNotificationService.notifyMemberLeft(serverId, userIdToRemove, username);
    }

    @Transactional
    public void deleteServer(String serverId, String userId) {
        Server server = getServerAndVerifyOwner(serverId, userId, "delete server");

        log.info("Deleting server {} by owner {}", serverId, userId);

        memberNotificationService.notifyServerDeleted(serverId);

        ServerDeletedEvent event = new ServerDeletedEvent(serverId);
        rabbitTemplate.convertAndSend(EXCHANGE_INTERNAL, ROUTING_KEY_SERVER_DELETED, event);

        memberRepository.deleteByServerId(serverId);
        serverRepository.delete(server);
    }

    private Server getServerAndVerifyOwner(String serverId, String userId, String action) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException(serverId));

        if (!server.getOwnerId().equals(userId)) {
            log.info("User {} tried to {} without permission on server {}", userId, action, serverId);
            throw new SecurityException("Only the server owner can " + action);
        }
        return server;
    }

    private MemberDTO mapToMemberDTO(Member member, AppUser user) {
        return MemberDTO.builder()
                .userId(member.getUserId())
                .role(member.getRole())
                .username(user != null ? user.getUsername() : "unknown")
                .displayName(user != null ? user.getDisplayName() : UNKNOWN_USER)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .build();
    }

    private String getUsernameSafe(String userId) {
        return appUserRepository.findById(userId)
                .map(AppUser::getUsername)
                .orElse("Unknown");
    }
}