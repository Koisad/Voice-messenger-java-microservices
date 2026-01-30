import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { api } from './api/client';
import type { Server, Message } from './types';
import './App.css';
import { Hash, Volume2, Plus, LogOut } from 'lucide-react';

export default function App() {
  const auth = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadServers();
      // Clear URL params after login (remove code/state)
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [auth.isAuthenticated]);

  // Polling
  useEffect(() => {
    if (!selectedServerId || !selectedChannelId) return;
    api.getMessages(selectedServerId, selectedChannelId).then(setMessages).catch(console.error);
    const interval = setInterval(() => {
      api.getMessages(selectedServerId, selectedChannelId).then(setMessages).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedServerId, selectedChannelId]);

  // Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Members
  useEffect(() => {
    if (selectedServerId) {
      api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
    }
  }, [selectedServerId]);

  const loadServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName) return;
    try {
      await api.createServer(newServerName);
      setNewServerName("");
      setShowCreateServer(false);
      loadServers();
    } catch (err) {
      alert("Failed to create server");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedServerId || !selectedChannelId) return;

    try {
      await api.sendMessage(selectedServerId, selectedChannelId, messageInput);
      setMessageInput("");
      const now = new Date();
      setMessages(prev => [...prev, {
        id: 'temp-' + Date.now(),
        content: messageInput,
        senderId: auth.user?.profile.preferred_username || 'Me',
        serverId: selectedServerId,
        channelId: selectedChannelId,
        timestamp: now.toISOString()
      }]);
    } catch (err) {
      console.error("Msg send failed", err);
    }
  };

  const selectedServer = servers.find(s => s.id === selectedServerId);

  if (auth.isLoading) {
    return <div className="flex items-center justify-center h-full">Loading Auth...</div>;
  }

  if (auth.error) {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <h3>Auth Error</h3>
        <p>{auth.error.message}</p>
        <button className="btn btn-primary" onClick={() => auth.signinRedirect()}>Retry Login</button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <h1>Voice Messenger</h1>
        <button className="btn btn-primary" onClick={() => auth.signinRedirect()}>
          Log in with Keycloak
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* 1. Server Sidebar */}
      <nav className="server-sidebar">
        {servers.map(server => (
          <div
            key={server.id}
            className={`server-icon ${selectedServerId === server.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedServerId(server.id);
              if (server.channels && server.channels.length > 0) {
                setSelectedChannelId(server.channels[0].id);
              }
            }}
            title={server.name}
          >
            {server.name.substring(0, 2).toUpperCase()}
          </div>
        ))}
        <div className="server-icon server-icon-add" onClick={() => setShowCreateServer(true)}>
          <Plus />
        </div>
        <div className="server-icon" style={{ marginTop: 'auto', background: 'transparent', color: 'var(--danger)' }} onClick={() => auth.removeUser()}>
          <LogOut />
        </div>
      </nav>

      {/* 2. Channel Sidebar */}
      {selectedServer ? (
        <div className="channel-sidebar">
          <header className="server-header">
            <span>{selectedServer.name}</span>
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
          <div style={{ padding: 16, background: 'var(--bg-tertiary)' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{auth.user?.profile.preferred_username || "User"}</div>
            <div style={{ fontSize: 12, color: 'gray' }}>Online</div>
          </div>
        </div>
      ) : (
        <div className="channel-sidebar" style={{ alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
          Select a server
        </div>
      )}

      {/* 3. Chat Area */}
      <main className="chat-area">
        {selectedServer && selectedChannelId ? (
          <>
            <header className="chat-header">
              <Hash size={24} color="#949ba4" />
              <span>
                {selectedServer.channels.find(c => c.id === selectedChannelId)?.name || 'unknown'}
              </span>
            </header>

            <div className="messages-list">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className="message-item">
                  <div className="message-avatar"></div>
                  <div className="message-content-wrapper">
                    <div className="message-header">
                      <span className="message-author">
                        {msg.senderId === auth.user?.profile.preferred_username ? 'You' : msg.senderId}
                      </span>
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-text">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <div className="chat-input-wrapper">
                <input
                  className="chat-input"
                  placeholder={`Message #${selectedServer.channels.find(c => c.id === selectedChannelId)?.name}`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted">
            Welcome to Voice Messenger
          </div>
        )}
      </main>

      {/* 4. Members */}
      {selectedServer && (
        <aside className="members-sidebar">
          <h3 style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16 }}>Members</h3>
          {members.map((m, i) => (
            <div key={i} className="member-item">
              <div className="message-avatar" style={{ width: 32, height: 32 }}></div>
              <span>{m}</span>
            </div>
          ))}
        </aside>
      )}

      {/* Create Modal */}
      {showCreateServer && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowCreateServer(false);
        }}>
          <div className="modal-content">
            <h2 style={{ marginBottom: 8 }}>Customize Your Server</h2>
            <form onSubmit={handleCreateServer}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Server Name
              </label>
              <input
                className="input-field"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-center" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary w-full">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
