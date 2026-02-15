export interface User {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
}

export interface Channel {
    id: string;
    name: string;
    type: 'TEXT' | 'VOICE';
}

export interface Server {
    id: string;
    name: string; // Może być null w starych rekordach, obsłużymy to
    ownerId: string;
    channels: Channel[];
}

export interface Message {
    id: string;
    senderId: string;
    senderUsername?: string; // Username z backendu
    senderDisplayName?: string; // Display name z backendu
    content: string;
    serverId: string;
    channelId: string;
    timestamp: string;
    isToxic?: boolean; // AI toxicity detection flag (from backend, field name: toxic)
    toxic?: boolean; // Alternate field name from Java boolean `isToxic` serialization
}

export interface CreateServerRequest {
    name: string;
}

export interface RegisterRequestDTO {
    username: string;
    email: string;
    password: string;
}

export interface SendMessageRequest {
    serverId: string;
    channelId: string;
    content: string;
}

export interface LiveKitTokenResponse {
    token: string;
    serverUrl: string; // Lub 'url', zależnie od Twojego Java DTO. Tutaj przyjmuję serverUrl
}

export interface Member {
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
}

export type MemberDTO = Member;

// Friendship types
export type FriendshipStatus = 'PENDING' | 'FRIENDS';

export interface Friendship {
    id: string;
    friendId: string;
    friendUsername: string;
    friendDisplayName: string;
    friendAvatarUrl?: string;
    status: FriendshipStatus;
    isIncoming: boolean;
}

export interface FriendUser {
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

// DM types
export interface DMConversation {
    friendId: string;
    friendUsername: string;
    channelId: string;
    lastMessage?: Message;
}

// WebRTC Signaling types
export type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended' | 'ping' | 'pong';

export interface SignalMessage {
    type: SignalType;
    sender: string;      // userId (set by server)
    target: string;      // userId of recipient
    data?: any;          // WebRTC payload (SDP or ICE candidate)
    senderUsername?: string; // Optional username for display
}

// Analytics
export interface NetworkMetric {
    id: string;
    timestamp: string;
    rtt: number | null;
    packetsLost: number | null;
    packetLossRatio: number | null;
    jitter: number | null;
    metadata: {
        userId: string;
        serverId: string;
        roomId: string;
        connectionType: string;
    };
}