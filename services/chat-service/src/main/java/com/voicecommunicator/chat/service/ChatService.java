package com.voicecommunicator.chat.service;

import com.voicecommunicator.chat.model.Message;
import com.voicecommunicator.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
@RequiredArgsConstructor
public class ChatService {

    private final MessageRepository messageRepository;

    public Message saveMessage(String userId, String content) {
        Message message = new Message(userId, content);
        return messageRepository.save(message);
    }

    public List<Message> getMessageHistory() {
        return messageRepository.findAllByOrderByTimestampDesc();
    }
}