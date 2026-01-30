import type { Server, Message, CreateServerRequest, SendMessageRequest, LiveKitTokenResponse } from '../types';
import { getUserToken } from './config';

const BASE_URL = '/api';

const getHeaders = () => {
    const token = getUserToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

export const api = {
    // Serwery
    getServers: async (): Promise<Server[]> => {
        const res = await fetch(`${BASE_URL}/servers`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch servers');
        return res.json();
    },

    createServer: async (name: string): Promise<Server> => {
        const res = await fetch(`${BASE_URL}/servers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name } as CreateServerRequest)
        });
        if (!res.ok) throw new Error('Failed to create server');
        return res.json();
    },

    // Dołączanie / Opuszczanie / Członkowie
    joinServer: async (serverId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/join`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to join server');
    },

    leaveServer: async (serverId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/leave`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to leave server');
    },

    getServerMembers: async (serverId: string): Promise<string[]> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/members`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch members');
        return res.json();
    },

    // Czat
    getMessages: async (serverId: string, channelId: string): Promise<Message[]> => {
        const params = new URLSearchParams({ serverId, channelId });
        const res = await fetch(`${BASE_URL}/chat/history?${params.toString()}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
    },

    sendMessage: async (serverId: string, channelId: string, content: string): Promise<Message> => {
        const res = await fetch(`${BASE_URL}/chat/send`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ serverId, channelId, content } as SendMessageRequest)
        });
        if (!res.ok) throw new Error('Failed to send message');
        return res.json();
    },

    // LiveKit (Głos/Wideo)
    getLiveKitToken: async (channelId: string): Promise<LiveKitTokenResponse> => {
        const res = await fetch(`${BASE_URL}/media/token`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ channelId })
        });
        if (!res.ok) throw new Error('Failed to get media token');
        return res.json();
    }
};