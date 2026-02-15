package com.voicecommunicator.user.service;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import com.voicecommunicator.user.model.AppUser;
import com.voicecommunicator.user.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final RabbitTemplate rabbitTemplate;
    private final StorageService storageService;

    public AppUser syncUserFromToken(Jwt jwt) {
        String userId = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        String googleName = jwt.getClaimAsString("name");
        String googlePicture = jwt.getClaimAsString("picture");

        String calculatedDisplayName = googleName;
        if (calculatedDisplayName == null && email != null && email.contains("@")) {
            calculatedDisplayName = email.substring(0, email.indexOf("@"));
        }
        if (calculatedDisplayName == null) {
            calculatedDisplayName = username;
        }

        String finalDisplayName = calculatedDisplayName;

        return appUserRepository.findById(userId)
                .map(existingUser -> {
                    boolean changed = false;

                    if (username != null && !username.equals(existingUser.getUsername())) {
                        existingUser.setUsername(username);
                        changed = true;
                    }


                    if (email != null && !email.equals(existingUser.getEmail())) {
                        existingUser.setEmail(email);
                        changed = true;
                    }

                    if (existingUser.getAvatarUrl() == null && googlePicture != null) {
                        existingUser.setAvatarUrl(googlePicture);
                        changed = true;
                    }

                    if (existingUser.getDisplayName() == null) {
                        existingUser.setDisplayName(finalDisplayName);
                        changed = true;
                    }

                    if (changed) {
                        existingUser = appUserRepository.save(existingUser);
                        publishUserUpdate(existingUser);
                    }
                    return existingUser;
                })
                .orElseGet(() -> {
                    log.info("Creating new user: {}", userId);
                    AppUser newUser = AppUser.builder()
                            .userId(userId)
                            .username(username)
                            .email(email)
                            .displayName(finalDisplayName)
                            .avatarUrl(googlePicture)
                            .build();

                    AppUser saved = appUserRepository.save(newUser);
                    publishUserUpdate(saved);
                    return saved;
                });
    }

    public AppUser updateProfile(String userId, String newDisplayName, MultipartFile newAvatar) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean changed = false;

        if (newDisplayName != null && !newDisplayName.isBlank()) {
            user.setDisplayName(newDisplayName);
            changed = true;
        }

        if (newAvatar != null && !newAvatar.isEmpty()) {
            String url = storageService.uploadAvatar(newAvatar, userId);
            user.setAvatarUrl(url);
            changed = true;
        }

        if (changed) {
            user = appUserRepository.save(user);
            publishUserUpdate(user);
        }
        return user;
    }

    private void publishUserUpdate(AppUser user) {
        UserUpdatedEvent event = UserUpdatedEvent.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .build();

        rabbitTemplate.convertAndSend("internal.exchange", "user.updated", event);
        log.info("Sent user update event for: {}", user.getUsername());
    }

    public List<AppUser> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        return appUserRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query);
    }
}