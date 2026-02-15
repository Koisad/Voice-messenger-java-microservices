import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { UserSettingsModal } from './components/UserSettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UserBar } from './components/UserBar';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from './api/client';
import type { Server, Message, MemberDTO, User } from './types';
import './App.css';
import { Hash, Volume2, Plus, LogOut, Copy, Users, MessageCircle, AlertTriangle, Eye, EyeOff, Trash2, UserX, DoorOpen, BarChart3, UserPlus } from 'lucide-react';
import { useChatSocket } from './hooks/useChatSocket';
import { useWebRTCCall } from './hooks/useWebRTCCall';
import { useServerNotifications } from './hooks/useServerNotifications';
import { useUserNotifications } from './hooks/useUserNotifications';
import { Friends } from './components/Friends';
import { DirectMessages } from './components/DirectMessages';
import { VoiceCallModal } from './components/VoiceCallModal';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ServerAnalyticsPanel } from './components/ServerAnalyticsPanel';
import { useAnalyticsReporter } from './hooks/useAnalyticsReporter';
import { CustomVideoConference } from './components/CustomVideoConference';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { Linkify } from './components/Linkify';


// Wrapper component — must be inside <LiveKitRoom> to access Room context
function AnalyticsReporterInRoom({ roomId, mediaServerUrl, userToken }: { roomId: string | null; mediaServerUrl: string; userToken?: string }) {
    useAnalyticsReporter({ roomId, mediaServerUrl, userToken });
    return null;
}

export default function App() {
    const auth = useAuth();
    const currentUserId = auth.user?.profile.sub || '';

    // --- STAN DANYCH ---
    const [servers, setServers] = useState<Server[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<MemberDTO[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const { toasts, showToast, removeToast } = useToast();
    const { unreadCounts, fetchUnreadCounts, incrementUnreadCount, markAsRead } = useUnreadMessages(currentUserId);

    // --- STAN UI ---
    type ViewMode = 'servers' | 'friends' | 'dms' | 'analytics';
    const [viewMode, setViewMode] = useState<ViewMode>('servers');
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null); // Kanał "widoczny" (główny widok)
    const [chatChannelId, setChatChannelId] = useState<string | null>(null); // Kanał "czatowy" (do wyświetlania wiadomości)
    const [activeDMChannelId, setActiveDMChannelId] = useState<string | null>(null); // Aktywny kanał DM (jeśli jesteśmy w widoku DM)

    // Ensure LiveKit disconnects when leaving servers view to free up microphone
    useEffect(() => {
        if (viewMode !== 'servers') {
            setIsVoiceActive(false);
            setLiveKitToken("");
        }
    }, [viewMode]);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'JOIN'>('CREATE');
    const [inputVal, setInputVal] = useState("");
    const [messageInput, setMessageInput] = useState("");
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [viewedUser, setViewedUser] = useState<User | null>(null);

    // --- INVITE SYSTEM ---
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Check for ?joinServer=SERVER_ID
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinServerId = params.get('joinServer');
        if (joinServerId && auth.isAuthenticated) {
            // Auto-open join modal or try to join
            // Using the existing modal logic:
            setModalMode('JOIN');
            setInputVal(joinServerId);
            setShowModal(true);
            // Optionally clear the URL param to avoid reopening on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [auth.isAuthenticated]);

    const handleViewProfile = (user: User) => {
        // Ensure we have at least partial data. If we have an ID but missing other fields, 
        // the modal might show placeholders which is fine.
        setViewedUser(user);
    };

    // --- CHANNEL MANAGEMENT ---
    const [showAddChannel, setShowAddChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');

    // --- KICK MEMBER ---
    const [kickTarget, setKickTarget] = useState<{ userId: string; username: string } | null>(null);

    // --- CONFIRM MODALS ---
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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

    // Fetch unread counts when server is selected
    useEffect(() => {
        if (selectedServerId && selectedServer) {
            const channelIds = selectedServer.channels.map(c => c.id);
            // Pass chatChannelId to ignore it in the unread counts update (avoid race condition)
            fetchUnreadCounts(channelIds, chatChannelId || undefined);
        }
    }, [selectedServerId, selectedServer, chatChannelId, fetchUnreadCounts]);

    // Mark as read when channel changes
    // Mark as read when channel changes OR view mode changes (e.g. switching tabs)
    useEffect(() => {
        const isServerView = viewMode === 'servers';
        if (chatChannelId && isServerView) {
            markAsRead(chatChannelId);
        }
        return () => {
            if (chatChannelId && isServerView) {
                markAsRead(chatChannelId);
            }
        };
    }, [chatChannelId, viewMode, markAsRead]);

    // Same for DMs
    useEffect(() => {
        const isDMView = viewMode === 'dms';
        if (activeDMChannelId && isDMView) {
            markAsRead(activeDMChannelId);
        }
        return () => {
            if (activeDMChannelId && isDMView) {
                markAsRead(activeDMChannelId);
            }
        };
    }, [activeDMChannelId, viewMode, markAsRead]);

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
            if (data.userId === currentUserId) {
                showToast('Zostałeś wyrzucony z serwera', 'info');
                loadServers();
                if (selectedServerId) {
                    setSelectedServerId(null);
                    setSelectedChannelId(null);
                    setChatChannelId(null);
                }
            } else {
                if (selectedServerId) {
                    api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
                }
            }
        },
        onServerDeleted: (deletedServerId) => {
            console.log('[App] Server deleted:', deletedServerId);
            setServers(prev => prev.filter(s => s.id !== deletedServerId));
            if (selectedServerId === deletedServerId) {
                setSelectedServerId(null);
                setSelectedChannelId(null);
                setChatChannelId(null);
                showToast('Serwer został usunięty przez właściciela', 'info');
            }
        },
        onChannelAdded: (channel) => {
            console.log('[App] Channel added:', channel);
            setServers(prev => prev.map(s => {
                if (s.id === selectedServerId) {
                    if (s.channels.some(c => c.id === channel.id)) return s;
                    return { ...s, channels: [...s.channels, channel] };
                }
                return s;
            }));
        },
        onChannelRemoved: (channelId) => {
            console.log('[App] Channel removed:', channelId);
            setServers(prev => prev.map(s => {
                if (s.id === selectedServerId) {
                    return { ...s, channels: s.channels.filter(c => c.id !== channelId) };
                }
                return s;
            }));
            if (selectedChannelId === channelId) {
                setSelectedChannelId(null);
                setChatChannelId(null);
            }
        },
        onChannelMessage: (data) => {
            // Helper to get channel name (since notification payload might not include it, or we want local name)
            // But payload has content. We assume we have the channel in 'servers'.
            // data matches { serverId, channelId, senderId, senderUsername, content }

            // 1. Ignore own messages
            // Check both ID and username to be robust against format mismatches. 
            // Also check against backend User ID (currentUser.id) if available.
            const isSelf = data.senderId === currentUserId ||
                data.senderUsername === auth.user?.profile.preferred_username ||
                (currentUser && data.senderId === currentUser.id);

            // 2. Check if we are currently viewing this channel
            // We are viewing if viewMode is 'servers', selectedServerId matches, AND chatChannelId matches logic.
            // Note: chatChannelId is the TEXT channel. selectedChannelId usually syncs with it for text channels.
            const isViewing = viewMode === 'servers' &&
                selectedServerId === data.serverId &&
                chatChannelId === data.channelId;

            if (isSelf) {
                if (isViewing) {
                    // Even if it's our own message, ensure backend knows we read it up to this point
                    markAsRead(data.channelId);
                }
                return;
            }

            // DEBUG: Show toast if message is from self but check failed
            if (data.senderUsername === auth.user?.profile.preferred_username) {
                showToast(`DEBUG: Self-message not ignored! ID: ${data.senderId}, Current: ${currentUserId}, Backend: ${currentUser?.id}`, 'error');
            }

            if (isViewing) {
                // If we are viewing, mark as read immediately to update backend state
                markAsRead(data.channelId);
                return;
            }

            // 3. Find channel name for better toast
            const server = servers.find(s => s.id === data.serverId);
            const channel = server?.channels.find(c => c.id === data.channelId);
            const channelName = channel?.name || data.channelId;

            // Increment unread count if not viewing
            incrementUnreadCount(data.channelId);

            showToast(`#${channelName}: ${data.content}`, 'message');
        }
    });

    // --- USER NOTIFICATIONS (Friends & Calls) ---
    const [friendNotificationTrigger, setFriendNotificationTrigger] = useState(0);

    useUserNotifications({
        userId: auth.user?.profile.sub || null,
        userToken: auth.user?.access_token,
        onFriendRequest: (data) => {
            console.log('[App] Friend request received:', data);
            showToast(`Otrzymałeś zaproszenie do znajomych od ${data.senderName}`, 'info');
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
        },
        onDMReceived: (data) => {
            // Check if we are currently viewing this DM
            const isViewing = viewMode === 'dms' && activeDMChannelId === data.channelId;

            // Ignore own messages for unread count
            const myId = auth.user?.profile.sub;
            const myUsername = auth.user?.profile.preferred_username;

            const isSelf = data.senderId === myId ||
                data.senderName === myUsername ||
                (currentUser && data.senderId === currentUser.id);

            if (isSelf) {
                if (isViewing && data.channelId) {
                    markAsRead(data.channelId);
                }
                return;
            }

            if (isViewing) {
                if (data.channelId) markAsRead(data.channelId);
                return;
            }

            showToast(`${data.senderName}: ${data.content}`, 'message');
            // TODO: Handle DM unread counts (requires DM channel ID management in useUnreadMessages or separate logic)
            // For now, focusing on server channels per user request emphasis on "chat-service" context usually implied there.
            // But if data.channelId is available, we can try matching it.
            if (data.channelId) {
                incrementUnreadCount(data.channelId);
            }
        },
        onUserUpdated: (data) => {
            console.log('[App] User updated:', data);

            // Update members list
            setMembers(prev => prev.map(m => {
                if (m.userId === data.userId) {
                    return { ...m, displayName: data.displayName, avatarUrl: data.avatarUrl };
                }
                return m;
            }));



            // Update current user if it's me
            // Note: We check against auth.user.profile.sub as currentUser might not be updated yet? 
            // Actually currentUser is state, so it's fine.
            setCurrentUser(prev => {
                if (prev && prev.id === data.userId) {
                    return { ...prev, displayName: data.displayName, avatarUrl: data.avatarUrl };
                }
                return prev;
            });

            // Trigger refetch of friends / DMs lists
            setFriendNotificationTrigger(prev => prev + 1);
        }
    });

    // 1. Inicjalizacja po zalogowaniu + sync użytkownika
    // 1. Inicjalizacja po zalogowaniu + sync użytkownika
    useEffect(() => {
        if (auth.isAuthenticated) {
            api.syncUser()
                .then((user) => {
                    console.log('[AppUser] Sync completed', user);
                    setCurrentUser((prev) => user || prev);
                })
                .catch(err => console.error('[AppUser] Sync failed:', err));
            loadServers();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [auth.isAuthenticated]);

    // Helper for voice connection
    const connectToVoiceChannel = (channelId: string) => {
        const displayName = currentUser?.displayName || auth.user?.profile.preferred_username || "User";
        console.log('[App] Connecting to voice channel:', channelId, 'as:', displayName);
        api.getLiveKitToken(channelId, displayName)
            .then(data => {
                setLiveKitToken(data.token);
                setLiveKitUrl(data.serverUrl);
                setIsVoiceActive(true);
            })
            .catch(err => console.error("Błąd LiveKit:", err));
    };

    // ... (lines 389-688 skipped)

    {/* Servers */ }
    {
        servers.map(server => (
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
                {(server.name || "?").substring(0, 1).toUpperCase()}
            </div>
        ))
    }

    // 2. Obsługa zmiany kanału (Tekst vs Głos)
    useEffect(() => {
        if (!selectedChannel || !selectedServerId) {
            setIsVoiceActive(false);
            setLiveKitToken("");
            return;
        }

        let isMounted = true;

        // Obsługa LiveKit (tylko dla kanałów głosowych)
        if (selectedChannel.type === 'VOICE') {
            api.getLiveKitToken(selectedChannel.id)
                .then(data => {
                    if (isMounted) {
                        setLiveKitToken(data.token);
                        setLiveKitUrl(data.serverUrl);
                        setIsVoiceActive(true);
                    }
                })
                .catch(err => {
                    if (isMounted) console.error("Błąd LiveKit:", err);
                });
        } else {
            // Jeśli to nie kanał głosowy, a byliśmy w trybie głosowym - wyłączamy
            setIsVoiceActive(false);
            setLiveKitToken("");
        }

        return () => {
            isMounted = false;
        };
    }, [selectedChannelId, selectedServerId, selectedChannel]);

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
                selectDefaultChannels(newServer);
                showToast('Serwer został utworzony', 'success');
            } else {
                await api.joinServer(inputVal);
                await loadServers();
                showToast('Dołączono do serwera', 'success');
            }
            setShowModal(false);
            setInputVal('');
        } catch (err) {
            showToast('Operacja nieudana. Sprawdź ID lub spróbuj ponownie.', 'error');
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
            showToast('Skopiowano ID serwera! Wyślij je znajomemu, aby dołączył.', 'success');
        }
    };

    const [showRegister, setShowRegister] = useState(false);

    if (auth.isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <div>Ładowanie...</div>
            </div>
        );
    }

    // Check for OIDC errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'access_denied') {
        return (
            <div className="center-screen">
                <h2>Odmowa dostępu</h2>
                <p>Nie udało się zalogować przez zewnętrznego dostawcę.</p>
                <button className="login-btn login-btn-primary" onClick={() => {
                    window.location.href = window.location.origin;
                }} style={{ marginTop: 20, width: 'auto' }}>
                    Wróć do logowania
                </button>
            </div>
        );
    }

    if (auth.error) {
        return (
            <div className="center-screen">
                <div>Błąd logowania: {auth.error.message}</div>
                <button className="login-btn login-btn-primary" onClick={() => {
                    auth.removeUser();
                    window.location.href = window.location.origin;
                }} style={{ marginTop: 20, width: 'auto' }}>
                    Spróbuj ponownie
                </button>
            </div>
        );
    }

    if (!auth.isAuthenticated) {
        if (showRegister) {
            return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
        }
        return <LoginPage onRegisterClick={() => setShowRegister(true)} />;
    }

    const handleLogout = async () => {
        await auth.removeUser();
        sessionStorage.clear();
    };

    const requestLogout = () => setShowLogoutConfirm(true);


    const isServerOwner = selectedServer?.ownerId === currentUserId;



    const handleAddChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim() || !selectedServerId) return;

        try {
            await api.addChannel(selectedServerId, newChannelName.trim(), newChannelType);
            const updatedServers = await api.getServers();
            setServers(updatedServers);
            setNewChannelName('');
            setShowAddChannel(false);
            showToast('Kanał został dodany', 'success');
        } catch (err) {
            console.error('Failed to add channel:', err);
            showToast('Nie udało się dodać kanału', 'error');
        }
    };

    const handleRemoveChannel = async () => {
        if (!selectedServerId || !channelToDelete) return;
        try {
            await api.removeChannel(selectedServerId, channelToDelete.id);
            const updatedServers = await api.getServers();
            setServers(updatedServers);
            if (selectedChannelId === channelToDelete.id) {
                const updated = updatedServers.find(s => s.id === selectedServerId);
                if (updated) selectDefaultChannels(updated);
            }
            setChannelToDelete(null);
            showToast('Kanał został usunięty', 'success');
        } catch (err) {
            console.error('Failed to remove channel:', err);
            setChannelToDelete(null);
            showToast('Nie udało się usunąć kanału', 'error');
        }
    };

    const handleLeaveServer = async () => {
        if (!selectedServerId) return;
        try {
            await api.leaveServer(selectedServerId);
            setServers(prev => prev.filter(s => s.id !== selectedServerId));
            setSelectedServerId(null);
            setSelectedChannelId(null);
            setChatChannelId(null);
            setShowLeaveConfirm(false);
            showToast('Opuszczono serwer', 'info');
        } catch (err) {
            console.error('Failed to leave server:', err);
            setShowLeaveConfirm(false);
            showToast('Nie udało się opuścić serwera', 'error');
        }
    };

    const handleDeleteServer = async () => {
        if (!selectedServerId || !selectedServer) return;
        if (deleteConfirmInput !== selectedServer.name) return;
        console.log('[handleDeleteServer] Deleting server:', selectedServerId, selectedServer.name);
        try {
            await api.deleteServer(selectedServerId);
            console.log('[handleDeleteServer] Server deleted successfully');
            setServers(prev => prev.filter(s => s.id !== selectedServerId));
            setSelectedServerId(null);
            setSelectedChannelId(null);
            setChatChannelId(null);
            setShowDeleteConfirm(false);
            setDeleteConfirmInput('');
            showToast('Serwer został usunięty', 'info');
        } catch (err) {
            console.error('[handleDeleteServer] Failed:', err);
            setShowDeleteConfirm(false);
            setDeleteConfirmInput('');
            showToast('Nie udało się usunąć serwera', 'error');
        }
    };

    const handleKickMember = async () => {
        if (!selectedServerId || !kickTarget) return;
        try {
            await api.removeMember(selectedServerId, kickTarget.userId);
            setMembers(prev => prev.filter(m => m.userId !== kickTarget.userId));
            showToast(`Wyrzucono ${kickTarget.username} z serwera`, 'success');
            setKickTarget(null);
        } catch (err) {
            console.error('Failed to kick member:', err);
            setKickTarget(null);
            showToast('Nie udało się wyrzucić użytkownika', 'error');
        }
    };

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

                <div
                    className={`server-icon analytics-icon ${viewMode === 'analytics' ? 'active' : ''}`}
                    onClick={() => setViewMode('analytics')}
                    title="Analityka Sieci"
                >
                    <BarChart3 size={24} />
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
                        <div className="server-header-actions">
                            <div
                                className="icon-btn"
                                onClick={() => setShowInviteModal(true)}
                                title="Zaproś znajomych"
                            >
                                <UserPlus size={18} />
                            </div>
                            <div
                                className="icon-btn"
                                onClick={copyInvite}
                                title="Skopiuj ID zaproszenia"
                            >
                                <Copy size={18} />
                            </div>
                        </div>
                    </header>

                    <div className="channel-list">
                        <div className="channel-section-header">
                            <span>KANAŁY</span>
                            {isServerOwner && (
                                <button className="channel-add-btn" onClick={() => setShowAddChannel(!showAddChannel)} title="Dodaj kanał">
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>

                        {showAddChannel && isServerOwner && (
                            <form className="channel-add-form" onSubmit={handleAddChannel}>
                                <input
                                    className="channel-add-input"
                                    value={newChannelName}
                                    onChange={e => setNewChannelName(e.target.value)}
                                    placeholder="Nazwa kanału"
                                    autoFocus
                                />
                                <div className="channel-add-type">
                                    <button
                                        type="button"
                                        className={`type-btn ${newChannelType === 'TEXT' ? 'active' : ''}`}
                                        onClick={() => setNewChannelType('TEXT')}
                                    >
                                        <Hash size={14} /> Tekst
                                    </button>
                                    <button
                                        type="button"
                                        className={`type-btn ${newChannelType === 'VOICE' ? 'active' : ''}`}
                                        onClick={() => setNewChannelType('VOICE')}
                                    >
                                        <Volume2 size={14} /> Głos
                                    </button>
                                </div>
                                <button type="submit" className="btn btn-primary channel-add-submit">Dodaj</button>
                            </form>
                        )}

                        {selectedServer.channels?.map(channel => (
                            <div
                                key={channel.id}
                                className={`channel-item ${selectedChannelId === channel.id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedChannelId(channel.id);
                                    if (channel.type === 'TEXT') {
                                        setChatChannelId(channel.id);
                                    }
                                }}
                            >
                                <span className="channel-item-name">
                                    {channel.type === 'VOICE' ? <Volume2 size={18} /> : <Hash size={18} />}
                                    <span style={{ fontWeight: (unreadCounts[channel.id] || 0) > 0 ? 'bold' : 'normal' }}>
                                        {channel.name}
                                    </span>
                                    {unreadCounts[channel.id] > 0 && (
                                        <span className="unread-badge">
                                            {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                                        </span>
                                    )}
                                </span>
                                {isServerOwner && (
                                    <button
                                        className="channel-delete-btn"
                                        onClick={(e) => { e.stopPropagation(); setChannelToDelete({ id: channel.id, name: channel.name }); }}
                                        title="Usuń kanał"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <ServerAnalyticsPanel
                        serverId={selectedServerId}
                        mediaServerUrl={liveKitUrl}
                        currentUserId={currentUserId}
                    />

                    {!isServerOwner && (
                        <button className="leave-server-btn" onClick={() => setShowLeaveConfirm(true)}>
                            <DoorOpen size={16} /> Opuść serwer
                        </button>
                    )}

                    {isServerOwner && (
                        <button className="delete-server-btn" onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmInput(''); }}>
                            <Trash2 size={16} /> Usuń serwer
                        </button>
                    )}



                    <UserBar
                        currentUser={currentUser}
                        onOpenSettings={() => setShowSettingsModal(true)}
                    />
                </div>
            ) : (
                !['friends', 'dms', 'analytics'].includes(viewMode) && (
                    <div className="channel-sidebar placeholder" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p>Wybierz serwer</p>
                        </div>
                        <div style={{ width: '100%' }}>
                            <UserBar
                                currentUser={currentUser}
                                onOpenSettings={() => setShowSettingsModal(true)}
                            />
                        </div>
                    </div>
                )
            )}

            {/* Conditional render based on view mode */}
            {viewMode === 'friends' && (
                <Friends
                    currentUserId={auth.user?.profile.sub || ''}
                    currentUsername={auth.user?.profile.preferred_username || ''}
                    onStartDM={handleStartDM}
                    onStartCall={handleStartCall}
                    notificationTrigger={friendNotificationTrigger}
                    currentUser={currentUser}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onUserClick={handleViewProfile}
                />
            )}

            {viewMode === 'dms' && (
                <DirectMessages
                    currentUserId={auth.user?.profile.sub || ''}
                    currentUsername={auth.user?.profile.preferred_username || ''}
                    userToken={auth.user?.access_token}
                    onBack={() => setViewMode('servers')}
                    onChannelSelect={(channelId) => {
                        setActiveDMChannelId(channelId);
                        if (channelId) markAsRead(channelId);
                    }}
                    unreadCounts={unreadCounts}
                    fetchUnreadCounts={fetchUnreadCounts}
                    currentUser={currentUser}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    notificationTrigger={friendNotificationTrigger}
                    onUserClick={handleViewProfile}
                />
            )}

            {viewMode === 'analytics' && (
                <AnalyticsDashboard
                    userId={auth.user?.profile.sub || ''}
                />
            )}

            <main className="chat-area" style={{ display: viewMode === 'servers' ? 'flex' : 'none' }}>
                {!selectedServerId ? (
                    <div className="welcome" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <h2>Witaj w Voice Messenger 👋</h2>
                            <p>Wybierz serwer z lewej strony lub stwórz nowy.</p>
                        </div>

                    </div>
                ) : selectedChannel?.type === 'VOICE' && !isVoiceActive ? (
                    <div className="welcome">
                        <div className="no-channel-selected">
                            <Volume2 size={48} color="#4b5563" />
                            <h3>{selectedChannel.name}</h3>
                            <p>Kanał głosowy (Rozłączono)</p>
                            <button className="btn btn-primary" onClick={() => connectToVoiceChannel(selectedChannel.id)}>
                                Dołącz
                            </button>
                        </div>
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
                                onDisconnected={() => {
                                    console.log("Disconnected from Room");
                                    setIsVoiceActive(false);
                                    setLiveKitToken("");
                                }}
                            >
                                <CustomVideoConference />
                                <AnalyticsReporterInRoom roomId={selectedServerId} mediaServerUrl={liveKitUrl} userToken={auth.user?.access_token} />
                            </LiveKitRoom>
                        </div>
                        <div className="voice-chat-sidebar">
                            <header className="chat-header">
                                <Hash size={24} color="#949ba4" />
                                <select
                                    className="channel-switcher"
                                    value={chatChannelId || ""}
                                    onChange={(e) => setChatChannelId(e.target.value)}
                                >
                                    {selectedServer?.channels
                                        .filter(c => c.type === 'TEXT')
                                        .map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {unreadCounts[c.id] > 0 ? `(${unreadCounts[c.id]})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </header>

                            <div className="messages-list">
                                {displayMessages.map((msg) => {
                                    const toxic = isMessageToxic(msg);
                                    const revealed = revealedToxicIds.has(msg.id);
                                    return (
                                        <div key={msg.id} className={`message-item ${toxic ? 'message-toxic' : ''}`}>
                                            <div
                                                className="message-avatar"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    const sender = members.find(m => m.userId === msg.senderId);
                                                    handleViewProfile({
                                                        id: msg.senderId,
                                                        username: msg.senderUsername || msg.senderId,
                                                        displayName: sender?.displayName || msg.senderDisplayName,
                                                        avatarUrl: sender?.avatarUrl
                                                    });
                                                }}
                                            >
                                                {(() => {
                                                    const sender = members.find(m => m.userId === msg.senderId);
                                                    const avatarUrl = sender?.avatarUrl;
                                                    return avatarUrl ? (
                                                        <img src={avatarUrl} alt={msg.senderUsername} className="user-avatar-img" />
                                                    ) : (
                                                        <div className="user-avatar-placeholder">
                                                            {(sender?.displayName || msg.senderUsername || "?").substring(0, 1).toUpperCase()}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="message-content">
                                                <div className="message-header">
                                                    <span
                                                        className="author"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => {
                                                            const sender = members.find(m => m.userId === msg.senderId);
                                                            handleViewProfile({
                                                                id: msg.senderId,
                                                                username: msg.senderUsername || msg.senderId,
                                                                displayName: sender?.displayName || msg.senderDisplayName,
                                                                avatarUrl: sender?.avatarUrl
                                                            });
                                                        }}
                                                    >
                                                        {(() => {
                                                            const member = members.find(m => m.userId === msg.senderId);
                                                            const isMe = currentUser?.id === msg.senderId;
                                                            return member?.displayName || (isMe ? currentUser?.displayName : null) || msg.senderUsername || (msg.senderId.length > 20 ? msg.senderId.substring(0, 8) + '...' : msg.senderId);
                                                        })()}
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
                                                        <Linkify>{msg.content}</Linkify>
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
                                        <div
                                            className="message-avatar"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                const sender = members.find(m => m.userId === msg.senderId);
                                                const isMe = currentUser?.id === msg.senderId;
                                                console.log('Clicked user:', msg.senderId, 'Found member:', sender, 'Is Me:', isMe);

                                                handleViewProfile({
                                                    id: msg.senderId,
                                                    username: msg.senderUsername || msg.senderId,
                                                    displayName: sender?.displayName || (isMe ? currentUser?.displayName : null) || msg.senderDisplayName,
                                                    avatarUrl: sender?.avatarUrl || (isMe ? currentUser?.avatarUrl : undefined)
                                                });
                                            }}
                                        >
                                            {(() => {
                                                const sender = members.find(m => m.userId === msg.senderId);
                                                const avatarUrl = sender?.avatarUrl;
                                                return avatarUrl ? (
                                                    <img src={avatarUrl} alt={msg.senderUsername} className="user-avatar-img" />
                                                ) : (
                                                    <div className="user-avatar-placeholder">
                                                        {(msg.senderUsername || "?").substring(0, 1).toUpperCase()}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="message-content">
                                            <div className="message-header">
                                                <span
                                                    className="author"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const sender = members.find(m => m.userId === msg.senderId);
                                                        const isMe = currentUser?.id === msg.senderId;
                                                        console.log('Clicked author:', msg.senderId, 'Found member:', sender, 'Is Me:', isMe);

                                                        handleViewProfile({
                                                            id: msg.senderId,
                                                            username: msg.senderUsername || msg.senderId,
                                                            displayName: sender?.displayName || (isMe ? currentUser?.displayName : null) || msg.senderDisplayName,
                                                            avatarUrl: sender?.avatarUrl || (isMe ? currentUser?.avatarUrl : undefined)
                                                        });
                                                    }}
                                                >
                                                    {(() => {
                                                        const sender = members.find(m => m.userId === msg.senderId);
                                                        const isMe = currentUser?.id === msg.senderId;
                                                        return sender?.displayName || (isMe ? currentUser?.displayName : null) || msg.senderUsername || (msg.senderId.length > 20 ? msg.senderId.substring(0, 8) + '...' : msg.senderId);
                                                    })()}
                                                </span>
                                                {toxic && <span className="toxic-badge"><AlertTriangle size={14} /> Potencjalnie wulgarna</span>}
                                                <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
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
                                                    <Linkify>{msg.content}</Linkify>
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
                )
                }
            </main >

            {selectedServer && !isVoiceActive && viewMode === 'servers' && (
                <aside className="members-sidebar">
                    <h3>CZŁONKOWIE — {members.length}</h3>
                    {members.map((m, i) => (
                        <div
                            key={i}
                            className="member-item"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewProfile({
                                id: m.userId,
                                username: m.username,
                                displayName: m.displayName,
                                avatarUrl: m.avatarUrl
                            })}
                        >
                            <div className="message-avatar small">
                                {m.avatarUrl ? (
                                    <img src={m.avatarUrl} alt={m.username} className="user-avatar-img" />
                                ) : (
                                    <div className="user-avatar-placeholder small">
                                        {(m.displayName || m.username || "?").substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="member-info">
                                <span className="member-name">{m.displayName || m.username}</span>
                                <span className={`member-role-badge ${m.role === 'OWNER' ? 'role-owner' : 'role-member'}`}>
                                    {m.role === 'OWNER' ? 'Właściciel' : 'Członek'}
                                </span>
                            </div>
                            {isServerOwner && m.userId !== currentUserId && (
                                <button
                                    className="member-kick-btn"
                                    onClick={() => setKickTarget({ userId: m.userId, username: m.username })}
                                    title="Wyrzuć z serwera"
                                >
                                    <UserX size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </aside>
            )}

            {
                showModal && (
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
                )
            }

            {/* Voice Call Modal */}
            <VoiceCallModal
                status={webrtcCall.callStatus}
                remotePeer={webrtcCall.remotePeer}
                remoteStream={webrtcCall.remoteStream}
                localStream={webrtcCall.localStream}
                onAnswer={() => {
                    if (isVoiceActive) {
                        setIsVoiceActive(false);
                        setLiveKitToken("");
                        showToast("Rozłączono z kanału głosowego, aby odebrać połączenie.", "info");
                    }
                    webrtcCall.answerCall();
                }}
                onReject={webrtcCall.rejectCall}
                onEnd={webrtcCall.endCall}
            />

            {
                showLogoutConfirm && (
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
                )
            }

            {
                kickTarget && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setKickTarget(null); }}>
                        <div className="logout-modal">
                            <div className="logout-modal-icon" style={{ background: 'rgba(237, 66, 69, 0.12)' }}>
                                <UserX size={32} />
                            </div>
                            <h2>Wyrzucić użytkownika?</h2>
                            <p>Czy na pewno chcesz wyrzucić <strong>{kickTarget.username}</strong> z serwera?</p>
                            <div className="logout-modal-actions">
                                <button className="btn logout-modal-cancel" onClick={() => setKickTarget(null)}>
                                    Anuluj
                                </button>
                                <button className="btn logout-modal-confirm" onClick={handleKickMember}>
                                    Wyrzuć
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showLeaveConfirm && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveConfirm(false); }}>
                        <div className="logout-modal">
                            <div className="logout-modal-icon" style={{ background: 'rgba(237, 66, 69, 0.12)' }}>
                                <DoorOpen size={32} />
                            </div>
                            <h2>Opuścić serwer?</h2>
                            <p>Czy na pewno chcesz opuścić serwer <strong>{selectedServer?.name}</strong>?</p>
                            <div className="logout-modal-actions">
                                <button className="btn logout-modal-cancel" onClick={() => setShowLeaveConfirm(false)}>
                                    Anuluj
                                </button>
                                <button className="btn logout-modal-confirm" onClick={handleLeaveServer}>
                                    Opuść
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showDeleteConfirm && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteConfirm(false); setDeleteConfirmInput(''); } }}>
                        <div className="logout-modal">
                            <div className="logout-modal-icon" style={{ background: 'rgba(237, 66, 69, 0.12)' }}>
                                <Trash2 size={32} />
                            </div>
                            <h2>Usunąć serwer?</h2>
                            <p>Tej operacji <strong>nie można cofnąć</strong>. Wszystkie kanały i wiadomości zostaną usunięte.</p>
                            <p className="delete-confirm-hint">Wpisz <strong>{selectedServer?.name}</strong> aby potwierdzić:</p>
                            <input
                                className="input-field delete-confirm-input"
                                value={deleteConfirmInput}
                                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                                placeholder={selectedServer?.name}
                                autoFocus
                            />
                            <div className="logout-modal-actions">
                                <button className="btn logout-modal-cancel" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmInput(''); }}>
                                    Anuluj
                                </button>
                                <button
                                    className="btn logout-modal-confirm"
                                    onClick={handleDeleteServer}
                                    disabled={deleteConfirmInput !== selectedServer?.name}
                                >
                                    Usuń
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                channelToDelete && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setChannelToDelete(null); }}>
                        <div className="logout-modal">
                            <div className="logout-modal-icon" style={{ background: 'rgba(237, 66, 69, 0.12)' }}>
                                <Trash2 size={32} />
                            </div>
                            <h2>Usunąć kanał?</h2>
                            <p>Czy na pewno chcesz usunąć kanał <strong>#{channelToDelete.name}</strong>? Tej operacji nie można cofnąć.</p>
                            <div className="logout-modal-actions">
                                <button className="btn logout-modal-cancel" onClick={() => setChannelToDelete(null)}>
                                    Anuluj
                                </button>
                                <button className="btn logout-modal-confirm" onClick={handleRemoveChannel}>
                                    Usuń
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {
                showSettingsModal && currentUser && (
                    <UserSettingsModal
                        currentUser={currentUser}
                        onClose={() => setShowSettingsModal(false)}
                        onUpdate={(updatedUser) => {
                            setCurrentUser(prev => ({ ...prev, ...updatedUser }));
                            setShowSettingsModal(false);
                            showToast('Profil zaktualizowany', 'success');
                        }}
                        onShowToast={showToast}
                    />
                )
            }

            {
                viewedUser && (
                    <UserProfileModal
                        user={viewedUser}
                        onClose={() => setViewedUser(null)}
                    />
                )
            }

            {showInviteModal && selectedServerId && selectedServer && (
                <InviteFriendsModal
                    serverName={selectedServer.name}
                    serverId={selectedServerId}
                    existingMemberIds={new Set(members.map(m => m.userId))}
                    onClose={() => setShowInviteModal(false)}
                    userToken={auth.user?.access_token}
                    currentUsername={currentUser?.username || auth.user?.profile.preferred_username}
                />
            )}
        </div >
    );
}