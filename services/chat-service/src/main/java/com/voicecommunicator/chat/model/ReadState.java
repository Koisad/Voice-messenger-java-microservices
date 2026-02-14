package com.voicecommunicator.chat.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "read_states")
public class ReadState {
    @Id
    private String id;
    private String userId;
    private String channelId;
    private Instant lastReadAt;
}
