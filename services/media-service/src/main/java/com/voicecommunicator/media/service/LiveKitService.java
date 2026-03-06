package com.voicecommunicator.media.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LiveKitService {

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    @Getter
    @Value("${livekit.url}")
    private String liveKitUrl;

    public String generateToken(String userId, String username, String channelId) {
        AccessToken token = new AccessToken(apiKey, apiSecret);

        token.setName(username);
        token.setIdentity(userId);

        token.addGrants(new RoomJoin(true));
        token.addGrants(new RoomName(channelId));

        token.setTtl(60000);

        return token.toJwt();
    }
}