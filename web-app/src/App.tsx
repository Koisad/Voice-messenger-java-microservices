import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from './api/client';
import type { Server, Message, MemberDTO } from './types';
import './App.css';
import { Hash, Volume2, Plus, LogOut, Copy, Users, MessageCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useChatSocket } from './hooks/useChatSocket';
import { useWebRTCCall } from './hooks/useWebRTCCall';
import { useServerNotifications } from './hooks/useServerNotifications';
import { useUserNotifications } from './hooks/useUserNotifications';
import { Friends } from './components/Friends';
import { DirectMessages } from './components/DirectMessages';
import { VoiceCallModal } from './components/VoiceCallModal';
import { LoginPage } from './components/LoginPage';

export default function App() {
    const auth = useAuth();

    // --- STAN DANYCH ---
    const [servers, setServers] = useState<Server[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<MemberDTO[]>([]);

    // --- STAN UI ---
    type ViewMode = 'servers' | 'friends' | 'dms';
    const [viewMode, setViewMode] = useState<ViewMode>('servers');
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null); // Kanał "widoczny" (główny widok)
    const [chatChannelId, setChatChannelId] = useState<string | null>(null); // Kanał "czatowy" (do wyświetlania wiadomości)

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'JOIN'>('CREATE');
    const [inputVal, setInputVal] = useState("");
    const [messageInput, setMessageInput] = useState("");
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // --- STAN LIVEKIT (GŁOS) ---
    const [liveKitToken, setLiveKitToken] = useState("");
    const [liveKitUrl, setLiveKitUrl] = useState("");
    const [isVoiceActive, setIsVoiceActive] = useState(false);

    // --- WEBSOCKET CHAT ---
    // --- TOXIC MESSAGE STATE ---
    const [revealedToxicIds, setRevealedToxicIds] = useState<Set<string>>(new Set());

    const toggleToxicReveal = (msgId: string) => {
        setRevealedToxicIds(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
    };

    // Helper: backend Java boolean `isToxic` may serialize as `toxic` or `isToxic`
    const isMessageToxic = (msg: Message): boolean => !!(msg.isToxic || msg.toxic);

    const handleReconnect = useCallback(() => {
        if (selectedServerId && chatChannelId) {
            api.getMessages(selectedServerId, chatChannelId)
                .then(setMessages)
                .catch(console.error);
        }
    }, [selectedServerId, chatChannelId]);

    const { socketMessages, sendMessage: sendSocketMessage } = useChatSocket({
        serverId: selectedServerId,
        channelId: chatChannelId,
        userToken: auth.user?.access_token,
        currentUserId: auth.user?.profile.sub,
        currentUsername: auth.user?.profile.preferred_username,
        onReconnect: handleReconnect
    });

    const bottomRef = useRef<HTMLDivElement>(null);
    const selectedServer = servers.find(s => s.id === selectedServerId);
    const selectedChannel = selectedServer?.channels.find(c => c.id === selectedChannelId);
    // Znajdź obiekt kanału, który jest aktualnie czatem (dla nazwy itp.)
    const chatChannel = selectedServer?.channels.find(c => c.id === chatChannelId);

    // --- WEBRTC CALL ---
    const webrtcCall = useWebRTCCall({
        userToken: auth.user?.access_token,
        currentUserId: auth.user?.profile.sub,
        currentUsername: auth.user?.profile.preferred_username
    });

    // --- SERVER MEMBER NOTIFICATIONS ---
    useServerNotifications({
        serverId: selectedServerId,
        userToken: auth.user?.access_token,
        onMemberJoined: (member) => {
            console.log('[App] Member joined:', member);
            if (selectedServerId) {
                api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
            }
        },
        onMemberLeft: (data) => {
            console.log('[App] Member left:', data);
            if (selectedServerId) {
                api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
            }
        }
    });

    // --- USER NOTIFICATIONS (Friends & Calls) ---
    const [friendNotificationTrigger, setFriendNotificationTrigger] = useState(0);

    useUserNotifications({
        userId: auth.user?.profile.sub || null,
        userToken: auth.user?.access_token,
        onFriendRequest: (data) => {
            console.log('[App] Friend request received:', data);
            setFriendNotificationTrigger(prev => prev + 1);
        },
        onFriendAccepted: (data) => {
            console.log('[App] Friend accepted:', data);
            setFriendNotificationTrigger(prev => prev + 1);
        },
        onFriendRemoved: (data) => {
            console.log('[App] Friend removed:', data);
            setFriendNotificationTrigger(prev => prev + 1);
        },
        onIncomingCall: (data) => {
            console.log('[App] Incoming call:', data);
            // Trigger incoming call in WebRTC
            // Note: The signaling service handles the WebRTC offer separately via WebSocket
            // This notification is just to alert the user of an incoming call
        }
    });

    // 1. Inicjalizacja po zalogowaniu + sync użytkownika
    useEffect(() => {
        if (auth.isAuthenticated) {
            api.syncUser()
                .then(() => console.log('[AppUser] Sync successful'))
                .catch(err => console.error('[AppUser] Sync failed:', err));
            loadServers();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [auth.isAuthenticated]);

    // 2. Obsługa zmiany kanału (Tekst vs Głos)
    useEffect(() => {
        if (!selectedChannel || !selectedServerId) return;

        // Reset wiadomości tylko jeśli zmienia się kanał CZATU
        // (Logika przeniesiona niżej do useEffect zależnego od chatChannelId)

        // Obsługa LiveKit (tylko dla kanałów głosowych)
        if (selectedChannel.type === 'VOICE') {
            api.getLiveKitToken(selectedChannel.id)
                .then(data => {
                    setLiveKitToken(data.token);
                    setLiveKitUrl(data.serverUrl);
                    setIsVoiceActive(true);
                })
                .catch(err => console.error("Błąd LiveKit:", err));
        } else {
            setIsVoiceActive(false);
            setLiveKitToken("");
        }
    }, [selectedChannelId, selectedServerId]);

    // 2a. Pobieranie wiadomości przy zmianie chatChannelId
    useEffect(() => {
        if (!chatChannelId || !selectedServerId) return;

        setMessages([]); // Reset przy zmianie kanału czatu

        api.getMessages(selectedServerId, chatChannelId)
            .then(setMessages)
            .catch(console.error);

    }, [chatChannelId, selectedServerId]);


    // 3. Scalanie REST history + WebSocket messages
    // Later messages (from WS) overwrite older ones (from REST) — this propagates isToxic updates
    const displayMessages = React.useMemo(() => {
        const uniqueMap = new Map<string, Message>();
        // REST messages first
        messages.forEach(msg => uniqueMap.set(msg.id, msg));
        // WS messages overwrite — carries updated isToxic flags
        socketMessages.forEach(msg => uniqueMap.set(msg.id, msg));
        return Array.from(uniqueMap.values()).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }, [messages, socketMessages]);

    // 5. Członkowie
    useEffect(() => {
        if (selectedServerId) {
            api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
        }
    }, [selectedServerId]);

    // 4. Scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayMessages]);

    // Pomocnicza funkcja do wybierania domyślnego kanału tekstowego
    const selectDefaultChannels = (server: Server) => {
        if (server.channels && server.channels.length > 0) {
            // Domyślny widok: pierwszy kanał (dowolny)
            setSelectedChannelId(server.channels[0].id);

            // Domyślny czat: pierwszy kanał TEKSTOWY
            const firstText = server.channels.find(c => c.type === 'TEXT');
            if (firstText) {
                setChatChannelId(firstText.id);
            } else {
                // Fallback: jeśli nie ma tekstowych, null lub ID pierwszego (ale wtedy czat może nie działać dobrze)
                setChatChannelId(null);
            }
        }
    };

    const loadServers = async () => {
        try {
            const data = await api.getServers();
            setServers(data);
        } catch (err) { console.error(err); }
    };

    const fetchMessages = () => {
        if (!selectedServerId || !chatChannelId) return;
        api.getMessages(selectedServerId, chatChannelId).then(setMessages).catch(console.error);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        try {
            if (modalMode === 'CREATE') {
                const newServer = await api.createServer(inputVal);
                setServers([...servers, newServer]);
                setSelectedServerId(newServer.id);
                selectDefaultChannels(newServer); // Ustaw domyślne kanały dla nowego serwera
            } else {
                await api.joinServer(inputVal);
                await loadServers();
            }
            setShowModal(false);
            setInputVal("");
        } catch (err) {
            alert("Operacja nieudana. Sprawdź ID lub spróbuj ponownie.");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedServerId || !chatChannelId) return;

        // Próba wysłania przez WebSocket
        const sentViaSocket = sendSocketMessage(messageInput);

        if (sentViaSocket) {
            setMessageInput("");
            // Wiadomość przyjdzie przez WebSocket
        } else {
            // Fallback REST jeśli WebSocket nie działa
            try {
                await api.sendMessage(selectedServerId, chatChannelId, messageInput);
                setMessageInput("");
                fetchMessages();
            } catch (err) { console.error(err); }
        }
    };

    const copyInvite = () => {
        if (selectedServerId) {
            navigator.clipboard.writeText(selectedServerId);
            alert("Skopiowano ID serwera! Wyślij je znajomemu, aby dołączył.");
        }
    };

    if (auth.isLoading) return <div className="center-screen">Ładowanie...</div>;
    if (auth.error) return <div className="center-screen">Błąd logowania: {auth.error.message}</div>;

    if (!auth.isAuthenticated) {
        return <LoginPage />;
    }

    const handleLogout = async () => {
        await auth.removeUser();
        sessionStorage.clear();
    };

    const requestLogout = () => setShowLogoutConfirm(true);

    const handleStartDM = () => {
        setViewMode('dms');
    };

    const handleStartCall = (friendId: string, friendUsername: string) => {
        webrtcCall.startCall(friendId, friendUsername);
    };

    return (
        <div className="app-layout">

            <nav className="server-sidebar">
                {/* Friends and DMs icons */}
                <div
                    className={`server-icon ${viewMode === 'friends' ? 'active' : ''}`}
                    onClick={() => setViewMode('friends')}
                    title="Znajomi"
                >
                    <Users size={24} />
                </div>

                <div
                    className={`server-icon ${viewMode === 'dms' ? 'active' : ''}`}
                    onClick={() => setViewMode('dms')}
                    title="Wiadomości Prywatne"
                >
                    <MessageCircle size={24} />
                </div>

                <div className="sidebar-separator" />

                {/* Servers */}
                {servers.map(server => (
                    <div
                        key={server.id}
                        className={`server-icon ${viewMode === 'servers' && selectedServerId === server.id ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('servers');
                            setSelectedServerId(server.id);
                            selectDefaultChannels(server);
                        }}
                        title={server.name}
                    >
                        {(server.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                ))}

                <div className="server-icon server-icon-add" onClick={() => {
                    setModalMode('CREATE');
                    setShowModal(true);
                }}>
                    <Plus />
                </div>

                <div className="server-icon logout-icon" onClick={requestLogout}>
                    <LogOut />
                </div>
            </nav>

            {selectedServer && viewMode === 'servers' ? (
                <div className="channel-sidebar">
                    <header className="server-header">
                        <span title={selectedServer.name}>
                            {(selectedServer.name || "Bez nazwy").length > 15
                                ? selectedServer.name?.substring(0, 15) + "..."
                                : selectedServer.name}
                        </span>
                        {/* POPRAWKA 2: Owinięcie ikony w div z title, bo Lucide nie obsługuje title bezpośrednio w strict TS */}
                        <div
                            className="icon-btn"
                            onClick={copyInvite}
                            title="Skopiuj ID zaproszenia"
                            style={{ cursor: 'pointer', display: 'flex' }}
                        >
                            <Copy size={18} />
                        </div>
                    </header>

                    <div className="channel-list">
                        {selectedServer.channels?.map(channel => (
                            <div
                                key={channel.id}
                                className={`channel-item ${selectedChannelId === channel.id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedChannelId(channel.id);
                                    // Jeśli to kanał tekstowy, ustawiamy go też jako kanał czatu
                                    if (channel.type === 'TEXT') {
                                        setChatChannelId(channel.id);
                                    }
                                }}
                            >
                                {channel.type === 'VOICE' ? <Volume2 size={18} /> : <Hash size={18} />}
                                {channel.name}
                            </div>
                        ))}
                    </div>

                    <div className="user-bar">
                        <div className="username">{auth.user?.profile.preferred_username}</div>
                        <div className="status">Online</div>
                    </div>
                </div>
            ) : (
                <div className="channel-sidebar placeholder">
                    <p>Wybierz serwer</p>
                </div>
            )}

            {/* Conditional render based on view mode */}
            {viewMode === 'friends' && (
                <Friends
                    currentUserId={auth.user?.profile.sub || ''}
                    currentUsername={auth.user?.profile.preferred_username || ''}
                    onStartDM={handleStartDM}
                    onStartCall={handleStartCall}
                    notificationTrigger={friendNotificationTrigger}
                />
            )}

            {viewMode === 'dms' && (
                <DirectMessages
                    currentUserId={auth.user?.profile.sub || ''}
                    currentUsername={auth.user?.profile.preferred_username || ''}
                    userToken={auth.user?.access_token}
                    onBack={() => setViewMode('servers')}
                />
            )}

            <main className="chat-area" style={{ display: viewMode === 'servers' ? 'flex' : 'none' }}>
                {!selectedServerId ? (
                    <div className="welcome">
                        <h2>Witaj w Voice Messenger 👋</h2>
                        <p>Wybierz serwer z lewej strony lub stwórz nowy.</p>
                    </div>
                ) : isVoiceActive && liveKitToken ? (
                    <div className="voice-chat-container">
                        <div className="voice-video-area">
                            <LiveKitRoom
                                video={false}
                                audio={true}
                                token={liveKitToken}
                                serverUrl={liveKitUrl}
                                connect={true}
                                data-lk-theme="default"
                                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                onError={(err) => console.error("LiveKit Error:", err)}
                            >
                                <VideoConference />
                            </LiveKitRoom>
                        </div>
                        <div className="voice-chat-sidebar">
                            <header className="chat-header">
                                <Hash size={24} color="#949ba4" />
                                <span>{chatChannel?.name || "Czat"}</span>
                            </header>

                            <div className="messages-list">
                                {displayMessages.map((msg) => {
                                    const toxic = isMessageToxic(msg);
                                    const revealed = revealedToxicIds.has(msg.id);
                                    return (
                                        <div key={msg.id} className={`message-item ${toxic ? 'message-toxic' : ''}`}>
                                            <div className="message-avatar" />
                                            <div className="message-content">
                                                <div className="message-header">
                                                    <span className="author">
                                                        {msg.senderUsername || (msg.senderId.length > 20 ? msg.senderId.substring(0, 8) + '...' : msg.senderId)}
                                                    </span>
                                                    <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                                    {toxic && <span className="toxic-badge"><AlertTriangle size={14} /> Potencjalnie wulgarna</span>}
                                                </div>
                                                {toxic && !revealed ? (
                                                    <div className="toxic-hidden-content">
                                                        <span>Treść ukryta — wykryto potencjalnie wulgarną treść</span>
                                                        <button className="toxic-reveal-btn" onClick={() => toggleToxicReveal(msg.id)}>
                                                            <Eye size={14} /> Pokaż treść
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text">
                                                        {msg.content}
                                                        {toxic && revealed && (
                                                            <button className="toxic-reveal-btn toxic-hide-btn" onClick={() => toggleToxicReveal(msg.id)}>
                                                                <EyeOff size={14} /> Ukryj
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
                                        placeholder={`Napisz na #${chatChannel?.name || "czacie"}`}
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="text-chat-container">
                        <header className="chat-header">
                            <Hash size={24} color="#949ba4" />
                            <span>{chatChannel?.name || "Czat"}</span>
                        </header>

                        <div className="messages-list">
                            {displayMessages.map((msg) => {
                                const toxic = isMessageToxic(msg);
                                const revealed = revealedToxicIds.has(msg.id);
                                return (
                                    <div key={msg.id} className={`message-item ${toxic ? 'message-toxic' : ''}`}>
                                        <div className="message-avatar" />
                                        <div className="message-content">
                                            <div className="message-header">
                                                <span className="author">
                                                    {msg.senderUsername || (msg.senderId.length > 20 ? msg.senderId.substring(0, 8) + '...' : msg.senderId)}
                                                </span>
                                                <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                                {toxic && <span className="toxic-badge"><AlertTriangle size={14} /> Potencjalnie wulgarna</span>}
                                            </div>
                                            {toxic && !revealed ? (
                                                <div className="toxic-hidden-content">
                                                    <span>Treść ukryta — wykryto potencjalnie wulgarną treść</span>
                                                    <button className="toxic-reveal-btn" onClick={() => toggleToxicReveal(msg.id)}>
                                                        <Eye size={14} /> Pokaż treść
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text">
                                                    {msg.content}
                                                    {toxic && revealed && (
                                                        <button className="toxic-reveal-btn toxic-hide-btn" onClick={() => toggleToxicReveal(msg.id)}>
                                                            <EyeOff size={14} /> Ukryj
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                    placeholder={`Napisz na #${chatChannel?.name || "czacie"}`}
                                />
                            </div>
                        </form>
                    </div>
                )}
            </main>

            {selectedServer && !isVoiceActive && viewMode === 'servers' && (
                <aside className="members-sidebar">
                    <h3>CZŁONKOWIE — {members.length}</h3>
                    {members.map((m, i) => (
                        <div key={i} className="member-item">
                            <div className="message-avatar small" />
                            <span>{m.username}</span>
                        </div>
                    ))}
                </aside>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
                    <div className="modal-content">
                        <div className="modal-tabs">
                            <button
                                className={modalMode === 'CREATE' ? 'active' : ''}
                                onClick={() => setModalMode('CREATE')}
                            >
                                Stwórz Serwer
                            </button>
                            <button
                                className={modalMode === 'JOIN' ? 'active' : ''}
                                onClick={() => setModalMode('JOIN')}
                            >
                                Dołącz do Serwera
                            </button>
                        </div>

                        <form onSubmit={handleModalSubmit}>
                            <label>
                                {modalMode === 'CREATE' ? 'NAZWA SERWERA' : 'ID SERWERA (ZAPROSZENIE)'}
                            </label>
                            <input
                                className="input-field"
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                autoFocus
                                placeholder={modalMode === 'CREATE' ? 'Np. Gaming Room' : 'Wklej ID tutaj...'}
                            />
                            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 20 }}>
                                {modalMode === 'CREATE' ? 'Utwórz' : 'Dołącz'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Voice Call Modal */}
            <VoiceCallModal
                status={webrtcCall.callStatus}
                remotePeer={webrtcCall.remotePeer}
                remoteStream={webrtcCall.remoteStream}
                localStream={webrtcCall.localStream}
                onAnswer={webrtcCall.answerCall}
                onReject={webrtcCall.rejectCall}
                onEnd={webrtcCall.endCall}
            />

            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}>
                    <div className="logout-modal">
                        <div className="logout-modal-icon">
                            <LogOut size={32} />
                        </div>
                        <h2>Wylogować się?</h2>
                        <p>Czy na pewno chcesz się wylogować z Voice Messenger?</p>
                        <div className="logout-modal-actions">
                            <button className="btn logout-modal-cancel" onClick={() => setShowLogoutConfirm(false)}>
                                Anuluj
                            </button>
                            <button className="btn logout-modal-confirm" onClick={handleLogout}>
                                Wyloguj
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}