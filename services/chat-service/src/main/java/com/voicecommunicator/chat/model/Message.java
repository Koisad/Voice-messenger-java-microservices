package com.voicecommunicator.chat.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "messages")
public class Message {

    @Id
    private String id;
    private String senderId;
    private String content;

    private String serverId;
    private String channelId;

    private LocalDateTime timestamp;

}