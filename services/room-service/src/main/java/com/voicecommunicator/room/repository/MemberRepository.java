package com.voicecommunicator.room.repository;

import com.voicecommunicator.room.model.Member;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends MongoRepository<Member, String> {
    List<Member> findByUserId(String userId);
    List<Member> findByServerId(String serverId);
    Optional<Member> findByServerIdAndUserId(String serverId, String userId);

    boolean existsByServerIdAndUserId(String serverId, String userId);
    void deleteByServerIdAndUserId(String serverId, String userId);
    void deleteByServerId(String serverId);
}
