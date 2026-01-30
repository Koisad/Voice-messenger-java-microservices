import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import './index.css'; // Zakładam, że style przeniesiemy tutaj lub do index.css

// Typy danych z Backendu
interface Channel {
    id: string;
    name: string;
    type: 'TEXT' | 'VOICE';
}

interface Server {
    id: string;
    name: string;
    ownerId: string;
    channels: Channel[];
}

const API_URL = 'https://api.voicemessenger.mywire.org';

export default function App() {
    const auth = useAuth();

    // Stan aplikacji
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServer, setSelectedServer] = useState<Server | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

    // LiveKit Stan
    const [liveKitToken, setLiveKitToken] = useState('');
    const [liveKitUrl, setLiveKitUrl] = useState('');

    // UI Stan
    const [isCreatingServer, setIsCreatingServer] = useState(false);
    const [newServerName, setNewServerName] = useState('');

    // 1. Pobieranie listy serwerów po zalogowaniu
    useEffect(() => {
        if (auth.isAuthenticated && auth.user?.access_token) {
            fetchServers();
        }
    }, [auth.isAuthenticated, auth.user]);

    const fetchServers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/servers`, {
                headers: { Authorization: `Bearer ${auth.user?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setServers(data);
                if (data.length > 0 && !selectedServer) {
                    setSelectedServer(data[0]); // Wybierz pierwszy serwer domyślnie
                }
            }
        } catch (err) {
            console.error("Błąd pobierania serwerów", err);
        }
    };

    // 2. Tworzenie nowego serwera
    const handleCreateServer = async () => {
        if (!newServerName.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/servers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth.user?.access_token}`
                },
                // UWAGA: Klucz musi być serverName zgodnie z DTO w Javie!
                body: JSON.stringify({ serverName: newServerName })
            });

            if (res.ok) {
                const newServer = await res.json();
                setServers([...servers, newServer]);
                setSelectedServer(newServer);
                setIsCreatingServer(false);
                setNewServerName('');
            }
        } catch (err) {
            alert("Nie udało się utworzyć serwera");
        }
    };

    // 3. Dołączanie do kanału głosowego
    const joinVoiceChannel = async (channelId: string) => {
        if (activeChannelId === channelId) return; // Już tu jesteś

        try {
            const res = await fetch(`${API_URL}/api/media/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth.user?.access_token}`
                },
                // UWAGA: Backend oczekuje obiektu DTO
                body: JSON.stringify({ channelId: channelId })
            });

            if (res.ok) {
                const data = await res.json();
                setLiveKitToken(data.token);
                setLiveKitUrl(data.serverUrl); // Backend zwraca teraz serverUrl
                setActiveChannelId(channelId);
            } else {
                alert("Błąd pobierania tokena LiveKit");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- EKRANY ---

    if (auth.isLoading) {
        return <div className="loading-screen">🔄 Łączenie...</div>;
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="login-screen">
                <h1>Voice Messenger 🎤</h1>
                <button className="btn-primary" onClick={() => auth.signinRedirect()}>
                    Zaloguj przez Keycloak
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* LEWY PASEK: LISTA SERWERÓW */}
            <nav className="servers-nav">
                {servers.map(server => (
                    <div
                        key={server.id}
                        className={`server-icon ${selectedServer?.id === server.id ? 'active' : ''}`}
                        onClick={() => setSelectedServer(server)}
                        title={server.name}
                    >
                        {server.name.substring(0, 2).toUpperCase()}
                    </div>
                ))}
                <div className="server-icon add-server" onClick={() => setIsCreatingServer(true)}>+</div>
            </nav>

            {/* PANEL BOCZNY: LISTA KANAŁÓW */}
            <aside className="channels-sidebar">
                <div className="server-header">
                    <h3>{selectedServer?.name || "Wybierz serwer"}</h3>
                </div>

                {selectedServer && (
                    <div className="channels-list">
                        <div className="channel-category">KANAŁY GŁOSOWE</div>
                        {selectedServer.channels
                            .filter(ch => ch.type === 'VOICE')
                            .map(channel => (
                                <div
                                    key={channel.id}
                                    className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                                    onClick={() => joinVoiceChannel(channel.id)}
                                >
                                    🔊 {channel.name}
                                </div>
                            ))}

                        <div className="channel-category">KANAŁY TEKSTOWE</div>
                        {selectedServer.channels
                            .filter(ch => ch.type === 'TEXT')
                            .map(channel => (
                                <div key={channel.id} className="channel-item text-channel">
                                    # {channel.name}
                                </div>
                            ))}
                    </div>
                )}

                <div className="user-bar">
                    <div className="username">{auth.user?.profile.preferred_username}</div>
                    <button className="btn-small" onClick={() => auth.removeUser()}>Wyloguj</button>
                </div>
            </aside>

            {/* GŁÓWNY OBSZAR */}
            <main className="main-content">
                {liveKitToken ? (
                    <LiveKitRoom
                        video={true}
                        audio={true}
                        token={liveKitToken}
                        serverUrl={liveKitUrl}
                        connect={true}
                        data-lk-theme="default"
                        style={{ height: '100%' }}
                        onDisconnected={() => {
                            setLiveKitToken('');
                            setActiveChannelId(null);
                        }}
                    >
                        <VideoConference />
                    </LiveKitRoom>
                ) : (
                    <div className="welcome-placeholder">
                        <h2>Witaj w {selectedServer?.name} 👋</h2>
                        <p>Wybierz kanał głosowy z lewej strony, aby dołączyć.</p>
                    </div>
                )}
            </main>

            {/* MODAL TWORZENIA SERWERA */}
            {isCreatingServer && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Stwórz nowy serwer</h3>
                        <input
                            value={newServerName}
                            onChange={e => setNewServerName(e.target.value)}
                            placeholder="Nazwa serwera"
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button onClick={() => setIsCreatingServer(false)}>Anuluj</button>
                            <button className="btn-primary" onClick={handleCreateServer}>Utwórz</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}