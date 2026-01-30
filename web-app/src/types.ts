export interface User {
    id: string;
    username: string;
}

export interface Server {
    id: string;
    name: string;
    ownerId: string;
    channels: Channel[];
}

export interface Channel {
    id: string;
    name: string;
    type: 'TEXT' | 'VOICE';
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
