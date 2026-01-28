package com.voicecommunicator.signaling.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.voicecommunicator.signaling.model.SignalMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String userId = session.getPrincipal().getName();

        sessions.put(userId, session);
        System.out.println("Logged in (using token): " + userId + " [Session: " + session.getId() + "]");
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.values().remove(session);
        System.out.println("Disconnected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String senderId = session.getPrincipal().getName();
        String payload = message.getPayload();

        try {
            SignalMessage signalMessage = objectMapper.readValue(payload, SignalMessage.class);
            signalMessage.setSender(senderId);

            String targetUser = signalMessage.getTarget();
            WebSocketSession targetSession = sessions.get(targetUser);

            if ("offer".equals(signalMessage.getType()) ||
                    "answer".equals(signalMessage.getType()) ||
                    "ice-candidate".equals(signalMessage.getType())) {

                if (targetSession != null && targetSession.isOpen()) {
                    System.out.println("Passing " + signalMessage.getType() + " to " + targetUser);
                    targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(signalMessage)));
                } else {
                    System.out.println("User " + targetUser + " is not available");
                }
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}