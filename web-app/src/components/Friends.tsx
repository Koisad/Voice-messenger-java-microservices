import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Friendship, FriendUser } from '../types';
import { UserPlus, UserCheck, UserX, MessageSquare, Trash2, Search, Loader } from 'lucide-react';
import './Friends.css';

interface FriendsProps {
    currentUserId: string;
    currentUsername: string;
    onStartDM: (friendId: string, friendUsername: string) => void;
    onStartCall?: (friendId: string, friendUsername: string) => void;
}

export const Friends: React.FC<FriendsProps> = ({ currentUserId, onStartDM /*, onStartCall */ }) => {
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [requests, setRequests] = useState<Friendship[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, []);

    const loadFriends = async () => {
        try {
            const allFriendships = await api.getFriends();
            setFriends(allFriendships.filter(f => f.status === 'FRIENDS'));
        } catch (err) {
            console.error('Failed to load friends:', err);
        }
    };

    const loadRequests = async () => {
        try {
            const allRequests = await api.getFriendRequests();
            setRequests(allRequests);
        } catch (err) {
            console.error('Failed to load requests:', err);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const results = await api.searchUsers(query);
            // Filter out current user and existing friends
            const existingFriendIds = friends.map(f =>
                f.requesterId === currentUserId ? f.addresseeId : f.requesterId
            );
            const filtered = results.filter(
                u => u.userId !== currentUserId && !existingFriendIds.includes(u.userId)
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSendRequest = async (user: FriendUser) => {
        setLoading(true);
        try {
            await api.sendFriendRequest(user.userId, user.username);
            alert(`Wysłano zaproszenie do ${user.username}`);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            alert('Nie udało się wysłać zaproszenia');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (request: Friendship) => {
        setLoading(true);
        try {
            await api.acceptFriendRequest(request.id);
            await loadFriends();
            await loadRequests();
        } catch (err) {
            alert('Nie udało się zaakceptować zaproszenia');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async (request: Friendship) => {
        setLoading(true);
        try {
            await api.rejectFriendRequest(request.id);
            await loadRequests();
        } catch (err) {
            alert('Nie udało się odrzucić zaproszenia');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFriend = async (friendship: Friendship) => {
        const friendId = friendship.requesterId === currentUserId
            ? friendship.addresseeId
            : friendship.requesterId;
        const friendName = friendship.requesterId === currentUserId
            ? friendship.addresseeUsername
            : friendship.requesterUsername;

        if (!confirm(`Czy na pewno usunąć ${friendName} z listy znajomych ? `)) return;

        setLoading(true);
        try {
            await api.removeFriend(friendId);
            await loadFriends();
        } catch (err) {
            alert('Nie udało się usunąć znajomego');
        } finally {
            setLoading(false);
        }
    };

    const getFriendInfo = (friendship: Friendship) => {
        if (friendship.requesterId === currentUserId) {
            return { id: friendship.addresseeId, username: friendship.addresseeUsername };
        }
        return { id: friendship.requesterId, username: friendship.requesterUsername };
    };

    return (
        <div className="friends-container">
            <header className="friends-header">
                <h2>Znajomi</h2>
            </header>

            {/* Search Bar */}
            <div className="friends-search">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Wyszukaj użytkowników..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {searchLoading && <Loader size={18} className="spinner" />}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="search-results">
                    <h3>Wyniki wyszukiwania</h3>
                    {searchResults.map(user => (
                        <div key={user.userId} className="friend-item">
                            <div className="message-avatar" />
                            <span className="friend-name">{user.username}</span>
                            <button
                                className="btn-icon"
                                onClick={() => handleSendRequest(user)}
                                disabled={loading}
                                title="Wyślij zaproszenie"
                            >
                                <UserPlus size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="friends-tabs">
                <button
                    className={activeTab === 'friends' ? 'active' : ''}
                    onClick={() => setActiveTab('friends')}
                >
                    Znajomi ({friends.length})
                </button>
                <button
                    className={activeTab === 'requests' ? 'active' : ''}
                    onClick={() => setActiveTab('requests')}
                >
                    Zaproszenia ({requests.length})
                </button>
            </div>

            {/* Content */}
            <div className="friends-content">
                {activeTab === 'friends' ? (
                    friends.length === 0 ? (
                        <div className="empty-state">
                            <p>Nie masz jeszcze znajomych</p>
                            <p className="hint">Użyj wyszukiwarki powyżej, aby dodać znajomych</p>
                        </div>
                    ) : (
                        friends.map(friendship => {
                            const friend = getFriendInfo(friendship);
                            return (
                                <div key={friendship.id} className="friend-item">
                                    <div className="message-avatar" />
                                    <span className="friend-name">{friend.username}</span>
                                    <div className="friend-actions">
                                        {/* Call button disabled until WebRTC is ready */}
                                        {/* <button
                                            className="btn-icon"
                                            onClick={() => onStartCall(friend.id, friend.username)}
                                            title="Zadzwoń"
                                        >
                                            <Phone size={18} />
                                        </button> */}
                                        <button
                                            className="btn-icon"
                                            onClick={() => onStartDM(friend.id, friend.username)}
                                            title="Wyślij wiadomość"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => handleRemoveFriend(friendship)}
                                            title="Usuń znajomego"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    requests.length === 0 ? (
                        <div className="empty-state">
                            <p>Brak zaproszeń</p>
                        </div>
                    ) : (
                        requests.map(request => (
                            <div key={request.id} className="friend-item">
                                <div className="message-avatar" />
                                <div className="request-info">
                                    <span className="friend-name">{request.requesterUsername}</span>
                                    <span className="request-label">wysłał zaproszenie</span>
                                </div>
                                <div className="friend-actions">
                                    <button
                                        className="btn-icon success"
                                        onClick={() => handleAcceptRequest(request)}
                                        disabled={loading}
                                        title="Zaakceptuj"
                                    >
                                        <UserCheck size={18} />
                                    </button>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleRejectRequest(request)}
                                        disabled={loading}
                                        title="Odrzuć"
                                    >
                                        <UserX size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};
