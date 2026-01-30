package com.voicecommunicator.room.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "members")
public class Member {
    @Id
    private String id;

    private String serverId;

    private String userId;

    private Role role;
}
