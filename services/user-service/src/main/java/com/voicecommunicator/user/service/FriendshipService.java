package com.voicecommunicator.user.service;

import com.voicecommunicator.user.dto.FriendshipResponseDTO;
import com.voicecommunicator.user.model.AppUser;
import com.voicecommunicator.user.model.Friendship;
import com.voicecommunicator.user.model.FriendshipStatus;
import com.voicecommunicator.user.repository.AppUserRepository;
import com.voicecommunicator.user.repository.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Function;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final AppUserRepository appUserRepository;
    private final UserNotificationService userNotificationService;

    public void sendFriendshipRequest(String requesterId, String requesterUsername, String addresseeId,
            String addresseeUsername) {
        if (requesterId.equals(addresseeId)) {
            throw new IllegalArgumentException("You cannot send friendship request to yourself");
        }

        if (friendshipRepository.findFriendship(requesterId, addresseeId).isPresent()) {
            throw new IllegalArgumentException("Friendship already exists");
        }

        Friendship friendship = Friendship.builder()
                .requesterId(requesterId)
                .requesterUsername(requesterUsername)
                .addresseeId(addresseeId)
                .addresseeUsername(addresseeUsername)
                .status(FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);
        userNotificationService.notifyFriendRequest(requesterId, requesterUsername, addresseeId);
    }

    public void acceptFriendshipRequest(String addresseeId, String friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friendship request not found"));

        if (!friendship.getAddresseeId().equals(addresseeId))
            throw new SecurityException("That is not your friendship request");

        friendship.setStatus(FriendshipStatus.FRIENDS);
        friendshipRepository.save(friendship);

        userNotificationService.notifyFriendAccepted(
                friendship.getAddresseeId(),
                friendship.getAddresseeUsername(),
                friendship.getRequesterId());
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponseDTO> getFriendshipRequests(String userId) {
        List<Friendship> requests = friendshipRepository.findAllByAddresseeIdAndStatus(userId, FriendshipStatus.PENDING);

        Set<String> requesterIds = requests.stream()
                .map(Friendship::getRequesterId)
                .collect(Collectors.toSet());

        Map<String, AppUser> profiles = appUserRepository.findAllById(requesterIds).stream()
                .collect(Collectors.toMap(AppUser::getUserId, Function.identity()));

        return requests.stream()
                .map(f -> mapToDTO(f, userId, profiles.get(f.getRequesterId())))
                .toList();
    }

    @Transactional
    public List<FriendshipResponseDTO> getFriends(String userId) {
        List<Friendship> friendships = friendshipRepository.findAllAcceptedByUserId(userId);

        Set<String> friendIds = friendships.stream()
                .map(f -> f.getRequesterId().equals(userId) ? f.getAddresseeId() : f.getRequesterId())
                .collect(Collectors.toSet());

        Map<String, AppUser> profiles = appUserRepository.findAllById(friendIds).stream()
                .collect(Collectors.toMap(AppUser::getUserId, Function.identity()));

        return friendships.stream()
                .map(f -> {
                    String friendId = f.getRequesterId().equals(userId) ? f.getAddresseeId() : f.getRequesterId();
                    return mapToDTO(f, userId, profiles.get(friendId));
                })
                .toList();
    }

    @Transactional
    public void removeFriendship(String user1Id, String user2Id) {
        Friendship friendship = friendshipRepository.findFriendship(user1Id, user2Id)
                .orElseThrow(() -> new IllegalArgumentException("Friendship not found"));

        friendshipRepository.delete(friendship);

        userNotificationService.notifyFriendRemoved(user1Id, user2Id);
        userNotificationService.notifyFriendRemoved(user2Id, user1Id);
    }

    private FriendshipResponseDTO mapToDTO(Friendship f, String currentUserId, AppUser friendProfile) {
        boolean amIRequester = f.getRequesterId().equals(currentUserId);
        String friendId = amIRequester ? f.getAddresseeId() : f.getRequesterId();

        String displayName = (friendProfile != null) ? friendProfile.getDisplayName() : "Unknown User";
        String username = (friendProfile != null) ? friendProfile.getUsername() : "unknown";
        String avatarUrl = (friendProfile != null) ? friendProfile.getAvatarUrl() : null;

        if (friendProfile == null) {
            username = amIRequester ? f.getAddresseeUsername() : f.getRequesterUsername();
            displayName = username;
        }

        return FriendshipResponseDTO.builder()
                .id(f.getId())
                .friendId(friendId)
                .friendUsername(username)
                .friendDisplayName(displayName)
                .friendAvatarUrl(avatarUrl)
                .status(f.getStatus())
                .isIncoming(!amIRequester)
                .build();
    }
}
