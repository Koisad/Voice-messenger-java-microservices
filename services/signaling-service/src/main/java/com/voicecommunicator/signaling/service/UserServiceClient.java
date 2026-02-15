package com.voicecommunicator.signaling.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceClient {

    private final RestClient.Builder restClientBuilder;

    @Value("${USER_SERVICE_URL}")
    private String userServiceUrl;

    public String getUserDisplayName(String userId, String token) {
        try {
            JsonNode json = restClientBuilder.build().get()
                    .uri(userServiceUrl + "/api/users/" + userId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(JsonNode.class);

            if (json != null && json.has("displayName")) {
                return json.get("displayName").asText();
            }
        } catch (Exception e) {
            log.warn("Could not retrieve displayName for {}: {}", userId, e.getMessage());
        }
        return null;
    }
}