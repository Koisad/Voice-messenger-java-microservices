package com.voicecommunicator.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserUpdatedEvent implements Serializable {
    private String userId;
    private String username;
    private String displayName;
    private String avatarUrl;
}