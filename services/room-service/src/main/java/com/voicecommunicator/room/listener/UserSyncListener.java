package com.voicecommunicator.room.listener;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import com.voicecommunicator.room.model.AppUser;
import com.voicecommunicator.room.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserSyncListener {

    private final AppUserRepository appUserRepository;

    @RabbitListener(queues = "room.user-sync")
    public void handleUserUpdated(UserUpdatedEvent event) {
        log.info("Updating room-service local user data for: {}", event.getUserId());

        AppUser user = AppUser.builder()
                .userId(event.getUserId())
                .username(event.getUsername())
                .displayName(event.getDisplayName())
                .avatarUrl(event.getAvatarUrl())
                .build();

        appUserRepository.save(user);
    }
}
