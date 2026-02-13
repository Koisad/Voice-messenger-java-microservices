package com.voicecommunicator.common.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserUpdatedEvent implements Serializable {
    private String userId;
    private String username;
}