import React from 'react';
import type { Message } from '../types';
import { Linkify } from './Linkify';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import './MessageBubble.css';

interface MessageBubbleProps {
    message: Message;
    isMine: boolean;
    onJoinClick?: (serverId: string) => void;
    onUserClick: () => void; // Handler for avatar/name click (passed from parent)
    revealedToxicIds: Set<string>;
    toggleToxicReveal: (msgId: string) => void;
    senderName: string;
    senderAvatarUrl?: string; // We pass this in directly to avoid looking at state inside bubble
    currentUser?: any; // For "isMe" checks if needed beyond isMine
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    // isMine, // Unused but kept in interface for potential future use
    onJoinClick,
    onUserClick,
    revealedToxicIds,
    toggleToxicReveal,
    senderName,
    senderAvatarUrl
}) => {
    // Check if message is toxic (using backend flags)
    // Backend Java boolean `isToxic` may serialize as `toxic` or `isToxic`
    const isToxic = !!(message.isToxic || message.toxic);
    const isRevealed = revealedToxicIds.has(message.id);

    // Function to parse content and looks for :::INVITE:...:::
    const renderContent = (text: string) => {
        // Regex: :::INVITE:SERVER_ID:SERVER_NAME:::
        const inviteRegex = /:::INVITE:([a-zA-Z0-9-]+):(.*):::/;
        const match = text.match(inviteRegex);

        if (match && onJoinClick) {
            const serverId = match[1];
            const serverName = match[2];

            return (
                <div className="invite-card">
                    <div className="invite-header">ZAPROSZENIE NA SERWER</div>
                    <div className="invite-body">
                        <div className="invite-server-icon">
                            {(serverName || "?").substring(0, 1).toUpperCase()}
                        </div>
                        <div className="invite-info">
                            <h4 className="invite-server-name">{serverName}</h4>
                            <span className="invite-hint">Kliknij, aby dołączyć</span>
                        </div>
                        <button
                            className="btn-join-server"
                            onClick={(e) => {
                                e.stopPropagation();
                                onJoinClick(serverId);
                            }}
                        >
                            Dołącz
                        </button>
                    </div>
                </div>
            );
        }

        // Fallback: Linkify (normal text)
        return <Linkify>{text}</Linkify>;
    };

    return (
        <div className={`message-item ${isToxic ? 'message-toxic' : ''}`}>
            <div
                className="message-avatar"
                style={{ cursor: 'pointer' }}
                onClick={onUserClick}
            >
                {senderAvatarUrl ? (
                    <img src={senderAvatarUrl} alt={senderName} className="user-avatar-img" />
                ) : (
                    <div className="user-avatar-placeholder">
                        {(senderName || "?").substring(0, 1).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="message-content">
                <div className="message-header">
                    <span
                        className="author"
                        style={{ cursor: 'pointer' }}
                        onClick={onUserClick}
                    >
                        {senderName}
                    </span>
                    <span className="time">{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {isToxic && (
                        <span className="toxic-badge">
                            <AlertTriangle size={14} /> Potencjalnie wulgarna
                        </span>
                    )}
                </div>

                {isToxic && !isRevealed ? (
                    <div className="toxic-hidden-content">
                        <span>Treść ukryta — wykryto potencjalnie wulgarną treść</span>
                        <button className="toxic-reveal-btn" onClick={() => toggleToxicReveal(message.id)}>
                            <Eye size={14} /> Pokaż treść
                        </button>
                    </div>
                ) : (
                    <div className="text" style={{ wordBreak: 'break-word' }}>
                        {renderContent(message.content)}
                        {isToxic && isRevealed && (
                            <button className="toxic-reveal-btn toxic-hide-btn" onClick={() => toggleToxicReveal(message.id)}>
                                <EyeOff size={14} /> Ukryj
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
