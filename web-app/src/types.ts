export interface User {
    id: string;
    username: string;
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
    content: string;
    serverId: string;
    channelId: string;
    timestamp: string;
}

export interface CreateServerRequest {
    name: string;
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