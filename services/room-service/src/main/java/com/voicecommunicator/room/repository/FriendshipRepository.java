package com.voicecommunicator.room.repository;

import com.voicecommunicator.room.model.Friendship;
import com.voicecommunicator.room.model.FriendshipStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends MongoRepository<Friendship, String> {
    // relation between users
    @Query("{ '$or': [ { 'requesterId': ?0, 'addresseeId': ?1 }, { 'requesterId': ?1, 'addresseeId': ?0 } ] }")
    Optional<Friendship> findFriendship(String userId1, String userId2);

    // list of friends (accepted)
    @Query("{ 'status': 'FRIENDS', '$or': [ { 'requesterId': ?0 }, { 'addresseeId': ?0 } ] }")
    List<Friendship> findAllAcceptedByUserId(String userId);

    // list of pending friendships (invites) for user
    List<Friendship> findAllByAddresseeIdAndStatus(String addresseeId, FriendshipStatus status);
}
