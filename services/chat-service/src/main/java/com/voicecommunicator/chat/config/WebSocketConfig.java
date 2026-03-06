package com.voicecommunicator.chat.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@Slf4j
@RequiredArgsConstructor
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtDecoder jwtDecoder;

    @Value("${INFRA_HOST}")
    private String relayHost;

    @Value("${STOMP_RELAY_PORT:61613}")
    private int relayPort;

    @Value("${STOMP_RELAY_LOGIN}")
    private String relayLogin;

    @Value("${STOMP_RELAY_PASSCODE}")
    private String relayPasscode;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("https://voicemessenger.mywire.org")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");

        log.info("Connecting to RabbitMQ Relay at {}:{}", relayHost, relayPort);

        registry.enableStompBrokerRelay("/topic", "/queue", "/exchange")
                .setRelayHost(relayHost)
                .setRelayPort(relayPort)
                .setClientLogin(relayLogin)
                .setClientPasscode(relayPasscode)
                .setSystemLogin(relayLogin)
                .setSystemPasscode(relayPasscode);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

                    List<String> authorization = accessor.getNativeHeader("Authorization");

                    if (authorization != null && !authorization.isEmpty()) {
                        String token = authorization.getFirst().replace("Bearer ", "");

                        try {
                            Jwt jwt = jwtDecoder.decode(token);

                            JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
                            AbstractAuthenticationToken auth = converter.convert(jwt);

                            accessor.setUser(auth);

                            log.info("WebSocket: User authenticated via JWT: {}", auth.getName());

                        } catch (Exception e) {
                            log.error("WebSocket: Token invalid: {}", e.getMessage());
                        }
                    } else {
                        log.warn("WebSocket: No Authorization header found");
                    }
                }
                return message;
            }
        });
    }
}