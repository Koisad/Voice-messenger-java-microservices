package com.voicecommunicator.signaling.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtDecoder jwtDecoder;

    public JwtHandshakeInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            String query = request.getURI().getQuery();
            if (query == null)
                return false;

            String token = UriComponentsBuilder.fromUri(request.getURI())
                    .build()
                    .getQueryParams()
                    .getFirst("access_token");

            if (token != null) {
                Jwt jwt = jwtDecoder.decode(token);
                JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

                attributes.put("user", authentication);

                System.out.println("WebSocket: Authenticated user " + jwt.getSubject());
                return true;
            }
        } catch (Exception e) {
            System.err.println("WebSocket authentication failed: " + e.getMessage());
        }
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception) {
    }
}