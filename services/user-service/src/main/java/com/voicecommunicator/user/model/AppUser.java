package com.voicecommunicator.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "users")
public class AppUser {
    @Id
    private String userId;
    private String email;
    private String username;
    private String displayName;
    private String avatarUrl;
}