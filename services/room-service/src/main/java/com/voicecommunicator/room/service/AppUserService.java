package com.voicecommunicator.room.service;

import com.voicecommunicator.room.model.AppUser;
import com.voicecommunicator.room.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppUserService {

    private final AppUserRepository appUserRepository;

    public void syncUser(String userId, String username) {
        appUserRepository.findById(userId)
                .ifPresentOrElse(
                        user -> {
                            if (!user.getUsername().equals(username)) {
                                user.setUsername(username);
                                appUserRepository.save(user);
                            }
                        },
                        () -> appUserRepository.save(new AppUser(userId, username))
                );
    }

    public List<AppUser> searchUsers(String query) {
        if (query == null || query.length() < 2) {
            return List.of();
        }
        return appUserRepository.findByUsernameContainingIgnoreCase(query);
    }
}