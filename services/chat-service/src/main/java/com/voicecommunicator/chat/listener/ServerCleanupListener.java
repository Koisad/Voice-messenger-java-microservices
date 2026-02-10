package com.voicecommunicator.chat.listener;

import com.voicecommunicator.common.event.ServerDeletedEvent;
import com.voicecommunicator.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class ServerCleanupListener {
    private final MessageRepository messageRepository;

    @RabbitListener(queues = "chat.server-cleanup")
    public void handleServerDeleted(ServerDeletedEvent event) {
        log.info("Received cleanup event for serverId: {}", event.getServerId());

        messageRepository.deleteAllByServerId(event.getServerId());

        log.info("Cleanup finished successfully for serverId: {}", event.getServerId());
    }
}
