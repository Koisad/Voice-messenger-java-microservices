package com.voicecommunicator.room.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "servers")
public class Server {
    @Id
    private String id;
    private String name;
    private String ownerId;
    private List<Channel> channels = new ArrayList<>();
}
