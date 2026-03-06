package com.voicecommunicator.room.repository;

import com.voicecommunicator.room.model.AppUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AppUserRepository extends MongoRepository<AppUser, String> {
    List<AppUser> findByUsernameContainingIgnoreCase(String username);
}