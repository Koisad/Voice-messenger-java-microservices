package com.voicecommunicator.signaling.config;

import com.voicecommunicator.signaling.handler.SocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SocketHandler socketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    public WebSocketConfig(SocketHandler socketHandler, JwtHandshakeInterceptor jwtHandshakeInterceptor) {
        this.socketHandler = socketHandler;
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(socketHandler, "/ws/signal")
                .setAllowedOriginPatterns("*")
                .addInterceptors(jwtHandshakeInterceptor)
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
                            Map<String, Object> attributes) {
                        return (Principal) attributes.get("user");
                    }
                });
    }
}