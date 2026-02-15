import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Friendship, Message } from '../types';
import { /* Phone, */ ArrowLeft, Send } from 'lucide-react';
import { useChatSocket } from '../hooks/useChatSocket';
import { UserBar } from './UserBar';
import './DirectMessages.css';
import { MessageBubble } from './MessageBubble';

interface DirectMessagesProps {
    currentUserId: string;
    currentUsername: string;
    userToken?: string;
    onStartCall?: (friendId: string, friendUsername: string) => void;
    onBack: () => void;
    onChannelSelect?: (channelId: string | null) => void;
    unreadCounts?: Record<string, number>;
    fetchUnreadCounts?: (channelIds: string[], ignoreChannelId?: string) => Promise<void>;
    notificationTrigger?: number;
    currentUser: any;
    onOpenSettings: () => void;
    onUserClick: (user: any) => void;
    onJoinClick: (serverId: string) => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
    currentUserId,
    currentUsername,
    userToken,
    // onStartCall, // DISABLED
    onBack,
    onChannelSelect,
    unreadCounts = {},
    fetchUnreadCounts,
    currentUser,
    onOpenSettings,
    notificationTrigger,
    onUserClick,
    onJoinClick
}) => {
    // ... (rest of imports/state)

    // Reload when notification trigger changes
    useEffect(() => {
        if (notificationTrigger !== undefined && notificationTrigger > 0) {
            loadFriends();
        }
    }, [notificationTrigger]);

    // ... (rest of code)

    // Update avatar rendering in the list (around line 225 usually)
    // I need to find the specific block for avatar rendering in DirectMessages to replace it.
    // Since I don't have the full file content in view, I'll stick to adding the prop and useEffect first.
    // refined avatar logic will be done in a separate step after locating it.
    // Extend Friendship with channelId
    type FriendWithChannel = Friendship & { channelId?: string };
    const [friends, setFriends] = useState<FriendWithChannel[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string; channelId: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [revealedToxicIds, setRevealedToxicIds] = useState<Set<string>>(new Set());
    const bottomRef = useRef<HTMLDivElement>(null);

    const toggleToxicReveal = (msgId: string) => {
        setRevealedToxicIds(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
    };



    const { socketMessages, sendMessage: sendSocketMessage } = useChatSocket({
        serverId: "dm",  // All DMs use constant serverId = "dm"
        channelId: selectedFriend?.channelId || null,
        userToken,
        currentUserId,
        currentUsername
    });

    useEffect(() => {
        loadFriends();
        return () => {
            if (onChannelSelect) onChannelSelect(null);
        };
    }, []);

    useEffect(() => {
        if (selectedFriend) {
            loadMessages(selectedFriend.channelId);
        }
    }, [selectedFriend?.channelId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, socketMessages]);

    const loadFriends = async () => {
        try {
            const allFriendships = await api.getFriends();
            const validFriends: FriendWithChannel[] = allFriendships.filter(f => f.status === 'FRIENDS');

            // Map friend IDs to channel IDs in parallel
            const friendsWithChannels = await Promise.all(validFriends.map(async (f) => {
                try {
                    const { channelId } = await api.getDMChannel(f.friendId);
                    return { ...f, channelId };
                } catch (e) {
                    return f;
                }
            }));

            setFriends(friendsWithChannels);

            if (fetchUnreadCounts) {
                const channelIds = friendsWithChannels.map(f => f.channelId).filter((id): id is string => !!id);
                if (channelIds.length > 0) {
                    fetchUnreadCounts(channelIds);
                }
            }
        } catch (err) {
            console.error('Failed to load friends:', err);
        }
    };

    const selectFriend = async (friendship: FriendWithChannel) => {
        try {
            // Use cached channelId if available, otherwise fetch
            let channelId = friendship.channelId;
            if (!channelId) {
                const res = await api.getDMChannel(friendship.friendId);
                channelId = res.channelId;
                // Update state to cache it
                setFriends(prev => prev.map(f => f.id === friendship.id ? { ...f, channelId } : f));
            }

            if (channelId) {
                setSelectedFriend({ id: friendship.friendId, username: friendship.friendUsername, channelId });
                if (onChannelSelect) onChannelSelect(channelId);
            }
        } catch (err) {
            console.error('Failed to get DM channel:', err);
        }
    };

    const loadMessages = async (channelId: string) => {
        try {
            // DM messages use constant serverId = "dm"
            const msgs = await api.getMessages('dm', channelId);
            setMessages(msgs);
        } catch (err) {
            console.error('Failed to load messages:', err);
            setMessages([]);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedFriend) return;

        const sentViaSocket = sendSocketMessage(messageInput);

        if (sentViaSocket) {
            setMessageInput('');
        } else {
            // Fallback REST - use "dm" as serverId
            try {
                await api.sendMessage('dm', selectedFriend.channelId, messageInput);
                setMessageInput('');
                loadMessages(selectedFriend.channelId);
            } catch (err) {
                console.error('Failed to send message:', err);
            }
        }
    };

    const displayMessages = React.useMemo(() => {
        const uniqueMap = new Map<string, Message>();
        messages.forEach(msg => uniqueMap.set(msg.id, msg));
        socketMessages.forEach(msg => uniqueMap.set(msg.id, msg));
        return Array.from(uniqueMap.values()).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }, [messages, socketMessages]);

    // Helper removed as Friendship DTO now has flattened friend info
    // const getFriendInfo = ...

    if (selectedFriend) {
        const friendInfo = friends.find(f => f.friendId === selectedFriend.id);

        return (
            <div className="dm-container">
                <header className="dm-header">
                    <button className="btn-back" onClick={() => {
                        setSelectedFriend(null);
                        if (onChannelSelect) onChannelSelect(null);
                    }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div
                        className="dm-friend-info"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                        onClick={() => {
                            // If we have friend info, use it. If not, use selectedFriend (partial)
                            onUserClick({
                                id: selectedFriend.id,
                                username: selectedFriend.username,
                                displayName: friendInfo?.friendDisplayName,
                                avatarUrl: friendInfo?.friendAvatarUrl
                            });
                        }}
                    >
                        <div className="message-avatar" style={{ width: '32px', height: '32px' }}>
                            {friendInfo?.friendAvatarUrl ? (
                                <img src={friendInfo.friendAvatarUrl} alt={selectedFriend.username} className="user-avatar-img" />
                            ) : (
                                <div className="user-avatar-placeholder" style={{ fontSize: '14px' }}>
                                    {(friendInfo?.friendDisplayName || selectedFriend.username || "?").substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h3 style={{ margin: 0 }}>{friendInfo?.friendDisplayName || selectedFriend.username}</h3>
                    </div>
                    <div className="dm-actions">
                        {/* Call button disabled until WebRTC is ready */}
                        {/* <button
                            className="call-btn"
                            onClick={() => onStartCall(selectedFriend.id, selectedFriend.username)}
                            title="Start Call"
                        >
                            <Phone size={18} /> Call
                        </button> */}
                    </div>
                </header>

                <div className="messages-list">
                    {displayMessages.map((msg) => {

                        // User info resolution
                        const friendInfo = friends.find(f => f.friendId === msg.senderId);
                        const isMe = currentUser?.id === msg.senderId;
                        const displayName = isMe ? currentUser?.displayName : (friendInfo?.friendDisplayName || msg.senderUsername);
                        const senderName = isMe ? (currentUser?.displayName || currentUser?.username || "Ja") : (friendInfo?.friendDisplayName || msg.senderUsername || msg.senderId);
                        const avatarUrl = isMe ? currentUser?.avatarUrl : friendInfo?.friendAvatarUrl;

                        const handleUserClick = () => {
                            onUserClick({
                                id: msg.senderId,
                                username: msg.senderUsername || msg.senderId,
                                displayName: displayName || msg.senderUsername,
                                avatarUrl: avatarUrl
                            });
                        };

                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMine={isMe}
                                revealedToxicIds={revealedToxicIds}
                                toggleToxicReveal={toggleToxicReveal}
                                onUserClick={handleUserClick}
                                senderName={senderName}
                                senderAvatarUrl={avatarUrl}
                                onJoinClick={onJoinClick}
                            />
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <div className="chat-input-wrapper">
                        <input
                            className="chat-input"
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            placeholder={`Napisz do ${selectedFriend.username}`}
                        />
                        <button type="submit" className="btn-send">
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="dm-container">
            <header className="dm-header">
                <button className="btn-back" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2>Wiadomości Prywatne</h2>
            </header>

            <div className="dm-list" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {friends.length === 0 ? (
                        <div className="empty-state">
                            <p>Brak znajomych do rozmowy</p>
                            <p className="hint">Dodaj znajomych, aby rozpocząć konwersację</p>
                        </div>
                    ) : (
                        friends.map(friendship => (
                            <div
                                key={friendship.id}
                                className="dm-item"
                                onClick={() => selectFriend(friendship)}
                            >
                                <div className="message-avatar">
                                    {friendship.friendAvatarUrl ? (
                                        <img src={friendship.friendAvatarUrl} alt={friendship.friendUsername} className="user-avatar-img" />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {(friendship.friendUsername || "?").substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="dm-info">
                                    <span className="dm-friend-name" style={{
                                        fontWeight: (friendship.channelId && unreadCounts[friendship.channelId]) ? 'bold' : 'normal'
                                    }}>
                                        {friendship.friendDisplayName || friendship.friendUsername}
                                    </span>
                                    {friendship.channelId && unreadCounts[friendship.channelId] ? (
                                        <span className="unread-badge">
                                            {unreadCounts[friendship.channelId] > 99 ? '99+' : unreadCounts[friendship.channelId]}
                                        </span>
                                    ) : (
                                        <div className="dm-status-text">
                                            {friendship.friendUsername}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <UserBar currentUser={currentUser} onOpenSettings={onOpenSettings} />
        </div >
    );
};
