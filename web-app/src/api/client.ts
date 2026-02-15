import type { Server, Message, CreateServerRequest, SendMessageRequest, LiveKitTokenResponse, MemberDTO, Friendship, NetworkMetric, User } from '../types';
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

    deleteServer: async (serverId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            console.error(`[deleteServer] HTTP ${res.status}: ${errorText}`);
            throw new Error(`Failed to delete server (${res.status})`);
        }
    },

    getServerMembers: async (serverId: string): Promise<MemberDTO[]> => {
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

    markChannelAsRead: async (channelId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/chat/read/${channelId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to mark channel as read');
    },

    getUnreadCounts: async (channelIds: string[]): Promise<Record<string, number>> => {
        const res = await fetch(`${BASE_URL}/chat/read/unread-counts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ channelIds })
        });
        if (!res.ok) throw new Error('Failed to get unread counts');
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
    getLiveKitToken: async (channelId: string, displayName?: string): Promise<LiveKitTokenResponse> => {
        const res = await fetch(`${BASE_URL}/media/token`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ channelId, displayName })
        });
        if (!res.ok) throw new Error('Failed to get media token');
        return res.json();
    },

    // User Management
    syncUser: async (): Promise<User> => {
        const res = await fetch(`${BASE_URL}/users/sync`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to sync user');
        return res.json();
    },

    updateProfile: async (displayName?: string, avatar?: File): Promise<User> => {
        const formData = new FormData();
        if (avatar) formData.append('avatar', avatar);
        if (displayName) formData.append('displayName', displayName);

        const token = getUserToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${BASE_URL}/users/me`, {
            method: 'PATCH',
            headers: headers,
            body: formData
        });

        if (!res.ok) throw new Error('Failed to update profile');
        return res.json();
    },

    searchUsers: async (query: string): Promise<User[]> => {
        const params = new URLSearchParams({ query });
        const res = await fetch(`${BASE_URL}/users/search?${params.toString()}`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to search users');
        return res.json();
    },

    // Friendships
    sendFriendRequest: async (addresseeId: string, addresseeUsername: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/friendships/request`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ addresseeId, addresseeUsername })
        });
        if (!res.ok) throw new Error('Failed to send friend request');
    },

    acceptFriendRequest: async (requestId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/friendships/accept/${requestId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to accept friend request');
    },

    getFriendRequests: async (): Promise<Friendship[]> => {
        const res = await fetch(`${BASE_URL}/friendships/requests`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch friend requests');
        return res.json();
    },

    getFriends: async (): Promise<Friendship[]> => {
        const res = await fetch(`${BASE_URL}/friendships`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch friends');
        return res.json();
    },

    removeFriend: async (friendId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/friendships/${friendId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to remove friend');
    },

    // Direct Messages
    getDMChannel: async (addresseeId: string): Promise<{ channelId: string }> => {
        const res = await fetch(`${BASE_URL}/chat/dm/${addresseeId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to get DM channel');
        return res.json();
    },

    // Channel Management
    addChannel: async (serverId: string, channelName: string, type: 'TEXT' | 'VOICE'): Promise<any> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/channels`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ channelName, type })
        });
        if (!res.ok) throw new Error('Failed to add channel');
        return res.json();
    },

    removeChannel: async (serverId: string, channelId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/channels/${channelId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to remove channel');
    },

    // Member Management
    removeMember: async (serverId: string, userId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/servers/${serverId}/members/${userId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to remove member');
    },

    // Analytics
    getServerMetrics: async (serverId: string): Promise<NetworkMetric[]> => {
        const res = await fetch(`${BASE_URL}/analytics/server?id=${encodeURIComponent(serverId)}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch server metrics');
        return res.json();
    },

    getRoomMetrics: async (roomId: string): Promise<NetworkMetric[]> => {
        const res = await fetch(`${BASE_URL}/analytics/room/${roomId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch room metrics');
        return res.json();
    },

    getUserMetrics: async (userId: string): Promise<NetworkMetric[]> => {
        const res = await fetch(`${BASE_URL}/analytics/user/${userId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch user metrics');
        return res.json();
    }
};
