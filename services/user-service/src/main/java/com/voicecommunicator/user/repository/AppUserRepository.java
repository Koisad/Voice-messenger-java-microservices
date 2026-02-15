package com.voicecommunicator.user.repository;

import com.voicecommunicator.user.model.AppUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AppUserRepository extends MongoRepository<AppUser, String> {
    List<AppUser> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(String username, String displayName);
}
