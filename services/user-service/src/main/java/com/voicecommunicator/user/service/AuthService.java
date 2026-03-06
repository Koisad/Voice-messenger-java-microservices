package com.voicecommunicator.user.service;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import com.voicecommunicator.user.dto.RegisterRequestDTO;
import com.voicecommunicator.user.model.AppUser;
import com.voicecommunicator.user.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final KeycloakService keycloakService;
    private final AppUserRepository appUserRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public void registerUser(RegisterRequestDTO request) {
        log.info("Starting registration for user: {}", request.getUsername());

        String userId = keycloakService.createUserInKeycloak(
                request.getUsername(),
                request.getEmail(),
                request.getPassword()
        );

        AppUser appUser = AppUser.builder()
                .userId(userId)
                .username(request.getUsername())
                .email(request.getEmail())
                .displayName(request.getUsername())
                .build();

        appUserRepository.save(appUser);

        UserUpdatedEvent event = new UserUpdatedEvent(
                userId,
                request.getUsername(),
                request.getUsername(),
                null
        );
        rabbitTemplate.convertAndSend("internal.exchange", "user.updated", event);

        log.info("User registered successfully: {} ({})", request.getUsername(), userId);
    }
}