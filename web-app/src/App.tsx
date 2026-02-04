import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from './api/client';
import type { Server, Message } from './types';
import './App.css';
// POPRAWKA 1: Usunięto nieużywany import 'User'
import { Hash, Volume2, Plus, LogOut, Copy } from 'lucide-react';
import { useChatSocket } from './hooks/useChatSocket';

export default function App() {
    const auth = useAuth();

    // --- STAN DANYCH ---
    const [servers, setServers] = useState<Server[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<string[]>([]);

    // --- STAN UI ---
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'JOIN'>('CREATE');
    const [inputVal, setInputVal] = useState("");
    const [messageInput, setMessageInput] = useState("");

    // --- STAN LIVEKIT (GŁOS) ---
    const [liveKitToken, setLiveKitToken] = useState("");
    const [liveKitUrl, setLiveKitUrl] = useState("");
    const [isVoiceActive, setIsVoiceActive] = useState(false);

    // --- WEBSOCKET CHAT ---
    const { socketMessages, sendMessage: sendSocketMessage } = useChatSocket({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        userToken: auth.user?.access_token,
        currentUserId: auth.user?.profile.sub, // UUID z JWT
        currentUsername: auth.user?.profile.preferred_username // Username do wysłania
    });

    const bottomRef = useRef<HTMLDivElement>(null);
    const selectedServer = servers.find(s => s.id === selectedServerId);
    const selectedChannel = selectedServer?.channels.find(c => c.id === selectedChannelId);

    // 1. Inicjalizacja po zalogowaniu
    useEffect(() => {
        if (auth.isAuthenticated) {
            loadServers();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [auth.isAuthenticated]);

    // 2. Obsługa zmiany kanału (Tekst vs Głos)
    useEffect(() => {
        if (!selectedChannel || !selectedServerId) return;

        // Reset wiadomości przy zmianie kanału
        setMessages([]);

        // Pobierz historię czatu dla obu typów kanałów
        api.getMessages(selectedServerId, selectedChannel.id)
            .then(setMessages)
            .catch(console.error);

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

    // 3. Scalanie REST history + WebSocket messages
    const displayMessages = React.useMemo(() => {
        const allMessages = [...messages, ...socketMessages];
        const uniqueMap = new Map();
        allMessages.forEach(msg => {
            uniqueMap.set(msg.id, msg);
        });
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


    const loadServers = async () => {
        try {
            const data = await api.getServers();
            setServers(data);
        } catch (err) { console.error(err); }
    };

    const fetchMessages = () => {
        if (!selectedServerId || !selectedChannelId) return;
        api.getMessages(selectedServerId, selectedChannelId).then(setMessages).catch(console.error);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        try {
            if (modalMode === 'CREATE') {
                const newServer = await api.createServer(inputVal);
                setServers([...servers, newServer]);
                setSelectedServerId(newServer.id);
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
        if (!messageInput.trim() || !selectedServerId || !selectedChannelId) return;

        // Próba wysłania przez WebSocket
        const sentViaSocket = sendSocketMessage(messageInput);

        if (sentViaSocket) {
            setMessageInput("");
            // Wiadomość przyjdzie przez WebSocket
        } else {
            // Fallback REST jeśli WebSocket nie działa
            try {
                await api.sendMessage(selectedServerId, selectedChannelId, messageInput);
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
        return (
            <div className="center-screen flex-col">
                <h1>Voice Messenger</h1>
                <button className="btn btn-primary" onClick={() => auth.signinRedirect()}>
                    Zaloguj przez Keycloak
                </button>
            </div>
        );
    }

    return (
        <div className="app-layout">

            <nav className="server-sidebar">
                {servers.map(server => (
                    <div
                        key={server.id}
                        className={`server-icon ${selectedServerId === server.id ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedServerId(server.id);
                            if (server.channels?.length > 0) setSelectedChannelId(server.channels[0].id);
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

                <div className="server-icon logout-icon" onClick={() => auth.signoutRedirect()}>
                    <LogOut />
                </div>
            </nav>

            {selectedServer ? (
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
                                onClick={() => setSelectedChannelId(channel.id)}
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

            <main className="chat-area">
                {!selectedServerId ? (
                    <div className="welcome">
                        <h2>Witaj w Voice Messenger 👋</h2>
                        <p>Wybierz serwer z lewej strony lub stwórz nowy.</p>
                    </div>
                ) : isVoiceActive && liveKitToken ? (
                    <LiveKitRoom
                        video={false}
                        audio={true}
                        token={liveKitToken}
                        serverUrl={liveKitUrl}
                        connect={true}
                        data-lk-theme="default"
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        <VideoConference />
                    </LiveKitRoom>
                ) : (
                    <>
                        <header className="chat-header">
                            <Hash size={24} color="#949ba4" />
                            <span>{selectedChannel?.name || "Czat"}</span>
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
                                    placeholder={`Napisz na #${selectedChannel?.name || "czacie"}`}
                                />
                            </div>
                        </form>
                    </>
                )}
            </main>

            {selectedServer && !isVoiceActive && (
                <aside className="members-sidebar">
                    <h3>CZŁONKOWIE — {members.length}</h3>
                    {members.map((m, i) => (
                        <div key={i} className="member-item">
                            <div className="message-avatar small" />
                            <span>{m}</span>
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

        </div>
    );
}