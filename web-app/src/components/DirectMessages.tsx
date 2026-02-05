import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Friendship, Message } from '../types';
import { /* Phone, */ ArrowLeft, Send } from 'lucide-react';
import { useChatSocket } from '../hooks/useChatSocket';
import './DirectMessages.css';

interface DirectMessagesProps {
    currentUserId: string;
    currentUsername: string;
    userToken?: string;
    onStartCall?: (friendId: string, friendUsername: string) => void;
    onBack: () => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
    currentUserId,
    currentUsername,
    userToken,
    // onStartCall, // DISABLED
    onBack
}) => {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string; channelId: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const { socketMessages, sendMessage: sendSocketMessage } = useChatSocket({
        serverId: "dm",  // All DMs use constant serverId = "dm"
        channelId: selectedFriend?.channelId || null,
        userToken,
        currentUserId,
        currentUsername
    });

    useEffect(() => {
        loadFriends();
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
            setFriends(allFriendships.filter(f => f.status === 'FRIENDS'));
        } catch (err) {
            console.error('Failed to load friends:', err);
        }
    };

    const selectFriend = async (friendship: Friendship) => {
        const friendId = friendship.requesterId === currentUserId
            ? friendship.addresseeId
            : friendship.requesterId;
        const friendUsername = friendship.requesterId === currentUserId
            ? friendship.addresseeUsername
            : friendship.requesterUsername;

        try {
            const { channelId } = await api.getDMChannel(friendId);
            setSelectedFriend({ id: friendId, username: friendUsername, channelId });
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
        const allMessages = [...messages, ...socketMessages];
        const uniqueMap = new Map();
        allMessages.forEach(msg => uniqueMap.set(msg.id, msg));
        return Array.from(uniqueMap.values()).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }, [messages, socketMessages]);

    const getFriendInfo = (friendship: Friendship) => {
        if (friendship.requesterId === currentUserId) {
            return { id: friendship.addresseeId, username: friendship.addresseeUsername };
        }
        return { id: friendship.requesterId, username: friendship.requesterUsername };
    };

    if (selectedFriend) {
        return (
            <div className="dm-container">
                <header className="dm-header">
                    <button className="btn-back" onClick={() => setSelectedFriend(null)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h3>{selectedFriend.username}</h3>
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
                    {displayMessages.map((msg) => (
                        <div key={msg.id} className="message-item">
                            <div className="message-avatar" />
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="author">
                                        {msg.senderUsername || (msg.senderId.length > 20 ? msg.senderId.substring(0, 8) + '...' : msg.senderId)}
                                    </span>
                                    <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="text">{msg.content}</div>
                            </div>
                        </div>
                    ))}
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

            <div className="dm-list">
                {friends.length === 0 ? (
                    <div className="empty-state">
                        <p>Brak znajomych do rozmowy</p>
                        <p className="hint">Dodaj znajomych, aby rozpocząć konwersację</p>
                    </div>
                ) : (
                    friends.map(friendship => {
                        const friend = getFriendInfo(friendship);
                        return (
                            <div
                                key={friendship.id}
                                className="dm-item"
                                onClick={() => selectFriend(friendship)}
                            >
                                <div className="message-avatar" />
                                <div className="dm-info">
                                    <span className="dm-friend-name">{friend.username}</span>
                                    <span className="dm-hint">Kliknij, aby otworzyć czat</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
