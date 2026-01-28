package com.voicecommunicator.media.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class LiveKitTokenService {

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    public String createToken(String userId, String roomName) {
        Algorithm algorithm = Algorithm.HMAC256(apiSecret);

        Map<String, Object> videoGrants = new HashMap<>();
        videoGrants.put("roomJoin", true);
        videoGrants.put("room", roomName);
        videoGrants.put("canPublish", true);
        videoGrants.put("canSubscribe", true);

        return JWT.create()
                .withIssuer(apiKey)
                .withExpiresAt(new Date(System.currentTimeMillis() + 3600 * 1000))
                .withSubject(userId)
                .withClaim("video", videoGrants)
                .withClaim("name", userId)
                .sign(algorithm);
    }
}