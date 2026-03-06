import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Friendship, FriendUser, User } from '../types';
import { UserPlus, UserCheck, UserX, Search, Loader, Phone, MessageCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { UserBar } from './UserBar';
import './Friends.css';

interface FriendsProps {
    currentUserId: string;
    currentUsername: string;
    onStartDM: (friendId: string, friendUsername: string) => void;
    onStartCall?: (friendId: string, friendUsername: string, friendUser?: any) => void;
    notificationTrigger?: number;
    currentUser: User | null;
    onOpenSettings: () => void;
    onUserClick: (user: User) => void;
}

export const Friends: React.FC<FriendsProps> = ({ currentUserId, onStartDM, onStartCall, notificationTrigger, currentUser, onOpenSettings, onUserClick }) => {
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [requests, setRequests] = useState<Friendship[]>([]);
    const [friendToRemove, setFriendToRemove] = useState<{ friendship: Friendship, name: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Toast
    const { showToast } = useToast();

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, []);

    // Refresh when notification is received
    useEffect(() => {
        if (notificationTrigger !== undefined && notificationTrigger > 0) {
            loadFriends();
            loadRequests();
        }
    }, [notificationTrigger]);

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

            // Map User[] to FriendUser[] to match state type
            const mappedResults: FriendUser[] = results.map(u => ({
                userId: u.id,
                username: u.username,
                displayName: u.displayName,
                avatarUrl: u.avatarUrl
            }));

            // Filter out current user and existing friends
            const existingFriendIds = friends.map(f => f.friendId);
            const filtered = mappedResults.filter(
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
            showToast(`Wysłano zaproszenie do ${user.displayName || user.username}`, 'success');
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            showToast('Nie udało się wysłać zaproszenia', 'error');
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
            showToast('Zaproszenie zaakceptowane', 'success');
        } catch (err) {
            showToast('Nie udało się zaakceptować zaproszenia', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async (request: Friendship) => {
        setLoading(true);
        try {
            // For rejecting a request, we can just use friendId (which is the requester)
            await api.removeFriend(request.friendId);
            await loadRequests();
            showToast('Zaproszenie odrzucone', 'info');
        } catch (err) {
            showToast('Nie udało się odrzucić zaproszenia', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmRemoveFriend = async () => {
        if (!friendToRemove) return;

        const friendId = friendToRemove.friendship.friendId;

        setLoading(true);
        try {
            await api.removeFriend(friendId);
            await loadFriends();
            showToast(`Usunięto ${friendToRemove.name} z listy znajomych`, 'success');
        } catch (err) {
            showToast('Nie udało się usunąć znajomego', 'error');
        } finally {
            setLoading(false);
            setFriendToRemove(null);
        }
    };

    const onRemoveClick = (friendship: Friendship) => {
        setFriendToRemove({ friendship, name: friendship.friendDisplayName || friendship.friendUsername });
    };

    // Helper removed as Friendship DTO now has flattened friend info
    // const getFriendInfo = ...

    return (
        <div className="friends-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                                <div className="message-avatar">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.username} className="user-avatar-img" />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {(user.displayName || user.username || "?").substring(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <span className="friend-name">{user.displayName || user.username}</span>
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
                <div className="friends-content" style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'friends' ? (
                        friends.length === 0 ? (
                            <div className="empty-state">
                                <p>Nie masz jeszcze znajomych</p>
                                <p className="hint">Użyj wyszukiwarki powyżej, aby dodać znajomych</p>
                            </div>
                        ) : (
                            friends.map(friendship => (
                                <div key={friendship.id} className="friend-item">
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                        onClick={() => onUserClick({
                                            id: friendship.friendId,
                                            username: friendship.friendUsername,
                                            displayName: friendship.friendDisplayName,
                                            avatarUrl: friendship.friendAvatarUrl
                                        })}
                                    >
                                        <div className="message-avatar">
                                            {friendship.friendAvatarUrl ? (
                                                <img src={friendship.friendAvatarUrl} alt={friendship.friendUsername} className="user-avatar-img" />
                                            ) : (
                                                <div className="user-avatar-placeholder">
                                                    {(friendship.friendDisplayName || friendship.friendUsername || "?").substring(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="friend-name">{friendship.friendDisplayName || friendship.friendUsername}</span>
                                    </div>
                                    <div className="friend-actions">
                                        {onStartCall && (
                                            <button
                                                className="btn-icon"
                                                onClick={() => {
                                                    onStartCall(friendship.friendId, friendship.friendUsername, {
                                                        id: friendship.friendId,
                                                        username: friendship.friendUsername,
                                                        displayName: friendship.friendDisplayName,
                                                        avatarUrl: friendship.friendAvatarUrl
                                                    });
                                                }}
                                                title="Zadzwoń"
                                            >
                                                <Phone size={20} />
                                            </button>
                                        )}
                                        {onStartDM && (
                                            <button
                                                className="btn-icon"
                                                onClick={() => onStartDM(friendship.friendId, friendship.friendUsername)}
                                                title="Wiadomość"
                                            >
                                                <MessageCircle size={20} />
                                            </button>
                                        )}
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => onRemoveClick(friendship)}
                                            title="Usuń ze znajomych"
                                        >
                                            <UserX size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        requests.length === 0 ? (
                            <div className="empty-state">
                                <p>Brak zaproszeń</p>
                            </div>
                        ) : (
                            requests.map(request => (
                                <div key={request.id} className="friend-item">
                                    <div className="message-avatar">
                                        {request.friendAvatarUrl ? (
                                            <img src={request.friendAvatarUrl} alt={request.friendUsername} className="user-avatar-img" />
                                        ) : (
                                            <div className="user-avatar-placeholder">
                                                {(request.friendUsername || "?").substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="request-info">
                                        <span className="friend-name">{request.friendUsername}</span>
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

            <UserBar currentUser={currentUser} onOpenSettings={onOpenSettings} />

            {/* Remove Friend Confirmation Modal */}
            {friendToRemove && (
                <div className="modal-overlay" onClick={() => setFriendToRemove(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Usuń znajomego</h3>
                        <p>Czy na pewno chcesz usunąć <strong>{friendToRemove.name}</strong> z listy znajomych?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                            <button
                                className="btn"
                                style={{ background: 'transparent', color: 'var(--text-primary)' }}
                                onClick={() => setFriendToRemove(null)}
                            >
                                Anuluj
                            </button>
                            <button
                                className="btn"
                                style={{ backgroundColor: 'var(--danger)' }}
                                onClick={confirmRemoveFriend}
                                disabled={loading}
                            >
                                {loading ? 'Usuwanie...' : 'Usuń'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
