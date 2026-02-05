package com.voicecommunicator.room.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@Document(collection = "friendships")
public class Friendship {

    @Id
    private String id;

    private FriendshipStatus status;

    private String requesterId;
    private String requesterUsername;

    private String addresseeId;
    private String addresseeUsername;
}
