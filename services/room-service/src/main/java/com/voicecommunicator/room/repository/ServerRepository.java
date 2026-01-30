package com.voicecommunicator.room.repository;

import com.voicecommunicator.room.model.Server;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ServerRepository extends MongoRepository<Server, String> {
    List<Server> findByOwnerId(String ownerId);
}
