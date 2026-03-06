package com.voicecommunicator.user.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.voicecommunicator.user.exception.UserAlreadyExistsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KeycloakService {

    private final RestClient.Builder restClientBuilder;

    @Value("${keycloak.server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.admin-client-id}")
    private String clientId;

    @Value("${keycloak.admin-client-secret}")
    private String clientSecret;

    private String getAccessToken() {
        String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token", serverUrl, realm);

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("grant_type", "client_credentials");

        RestClient client = restClientBuilder.build();

        try {
            TokenResponse response = client.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(TokenResponse.class);

            if (response != null) return response.accessToken;
        } catch (Exception e) {
            log.error("Failed to authenticate backend with Keycloak", e);
            throw new RuntimeException("Keycloak authentication failed");
        }
        throw new RuntimeException("Could not retrieve access token from Keycloak");
    }

    public String createUserInKeycloak(String username, String email, String password) {
        String token = getAccessToken();
        String createUrl = String.format("%s/admin/realms/%s/users", serverUrl, realm);

        Map<String, Object> userBody = Map.of(
                "username", username,
                "email", email,
                "enabled", true,
                "emailVerified", true,
                "credentials", List.of(Map.of(
                        "type", "password",
                        "value", password,
                        "temporary", false
                ))
        );

        return restClientBuilder.build().post()
                .uri(createUrl)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(userBody)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    if (response.getStatusCode().value() == 409) {
                        try {
                            String responseBody = new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8);
                            log.warn("Keycloak conflict: {}", responseBody);

                            if (responseBody.contains("email")) {
                                throw new UserAlreadyExistsException("Email is already taken", "email");
                            }
                            else if (responseBody.contains("username")) {
                                throw new UserAlreadyExistsException("Username is already taken", "username");
                            }

                        } catch (IOException e) {
                            log.error("Error reading response body", e);
                        }

                        throw new UserAlreadyExistsException("Użytkownik o takich danych już istnieje.", "general");
                    }

                    if (response.getStatusCode().value() == 400) {
                        log.error("Invalid data sent to Keycloak");
                        throw new IllegalArgumentException("Invalid user data (e.g. password too short)");
                    }

                    log.error("Backend authorization error: {}", response.getStatusCode());
                    throw new RuntimeException("Internal Server Error: Backend cannot communicate with Auth Server");
                })
                .onStatus(HttpStatusCode::is5xxServerError, (request, response) -> {
                    log.error("Keycloak Server Error: {}", response.getStatusCode());
                    throw new RuntimeException("Auth Server is currently unavailable");
                })
                .toBodilessEntity()
                .getHeaders()
                .getLocation()
                .getPath()
                .replaceAll(".*/([^/]+)$", "$1");
    }

    private record TokenResponse(@JsonProperty("access_token") String accessToken) {}
}