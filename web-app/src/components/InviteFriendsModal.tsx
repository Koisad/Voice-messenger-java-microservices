import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Friendship } from '../types';
import { X, Check } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface InviteFriendsModalProps {
    serverName: string;
    serverId: string;
    existingMemberIds: Set<string>;
    onClose: () => void;
    userToken?: string;
    currentUsername?: string;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
    serverName,
    serverId,
    existingMemberIds,
    onClose,
    userToken,
    currentUsername
}) => {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
    const clientRef = useRef<Client | null>(null);

    // Initialize WebSocket connection for sending messages
    useEffect(() => {
        if (!userToken) return;

        console.log('Initializing STOMP client for InviteFriendsModal');
        const client = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            debug: (str) => {
                console.log('[InviteSTOMP]: ' + str);
            },
            onConnect: () => {
                console.log('InviteSTOMP Connected');
            },
            onStompError: (frame) => {
                console.error('InviteSTOMP Error:', frame);
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log('Deactivating InviteSTOMP client');
            client.deactivate();
        };
    }, [userToken]);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const data = await api.getFriends();
            setFriends(data);
        } catch (err) {
            console.error('Failed to load friends:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (friend: Friendship) => {
        const friendId = friend.friendId;
        const friendName = friend.friendDisplayName || friend.friendUsername;

        if (!clientRef.current || !clientRef.current.connected) {
            alert('Błąd połączenia. Spróbuj ponownie za chwilę.');
            return;
        }

        try {
            // 1. Get/Create DM Channel
            const { channelId } = await api.getDMChannel(friendId);

            // 2. Prepare Invite Message
            const inviteLink = `${window.location.origin}?joinServer=${serverId}`;
            const messageContent = `Hej! Zapraszam Cię na serwer **${serverName}**.\nKod dołączenia to: \`${serverId}\`\n\nWejdź w link, aby dołączyć: ${inviteLink}`;

            // 3. Send via WebSocket
            clientRef.current.publish({
                destination: `/app/send/dm/${channelId}`,
                headers: {
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    username: currentUsername || 'Nieznany',
                    content: messageContent
                })
            });

            // 4. Mark as invited
            setInvitedFriends(prev => new Set(prev).add(friendId));
        } catch (err) {
            console.error(`Failed to invite ${friendName}:`, err);
            alert(`Nie udało się wysłać zaproszenia do ${friendName}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Zaproś znajomych</h2>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="friends-list" style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#b9bbbe' }}>Ładowanie...</div>
                    ) : friends.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#b9bbbe' }}>Brak znajomych do zaproszenia</div>
                    ) : (
                        friends.map(friend => {
                            const isInvited = invitedFriends.has(friend.friendId);
                            const isMember = existingMemberIds.has(friend.friendId);

                            return (
                                <div key={friend.friendId} className="friend-item" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px', borderBottom: '1px solid #2f3136'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#5865f2',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                        }}>
                                            {friend.friendAvatarUrl ? (
                                                <img src={friend.friendAvatarUrl} alt={friend.friendUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ color: 'white', fontWeight: 'bold' }}>
                                                    {(friend.friendDisplayName || friend.friendUsername).substring(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'white', fontWeight: 'bold' }}>{friend.friendDisplayName || friend.friendUsername}</span>
                                            <span style={{ color: '#b9bbbe', fontSize: '12px' }}>@{friend.friendUsername}</span>
                                        </div>
                                    </div>

                                    {isMember ? (
                                        <div style={{
                                            padding: '6px 16px',
                                            borderRadius: '3px',
                                            backgroundColor: 'transparent',
                                            color: '#b9bbbe',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase'
                                        }}>
                                            Członek
                                        </div>
                                    ) : (
                                        <button
                                            className={`btn ${isInvited ? 'btn-success' : 'btn-primary'}`}
                                            onClick={() => handleInvite(friend)}
                                            disabled={isInvited}
                                            style={{
                                                padding: '6px 16px',
                                                backgroundColor: isInvited ? 'transparent' : '#248046',
                                                border: isInvited ? '1px solid #248046' : 'none',
                                                color: isInvited ? '#248046' : 'white',
                                                cursor: isInvited ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            {isInvited ? (
                                                <>
                                                    <Check size={14} /> Wysłano
                                                </>
                                            ) : (
                                                'Zaproś'
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
