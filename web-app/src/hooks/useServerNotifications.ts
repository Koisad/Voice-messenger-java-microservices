import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Channel } from '../types';

interface UseServerNotificationsProps {
    serverId: string | null;
    userToken?: string | null;
    onMemberJoined?: (member: { userId: string; username: string; role: string }) => void;
    onMemberLeft?: (data: { userId: string; username: string }) => void;
    onServerDeleted?: (serverId: string) => void;
    onChannelAdded?: (channel: Channel) => void;
    onChannelRemoved?: (channelId: string) => void;
    onChannelMessage?: (data: { serverId: string; channelId: string; senderId: string; senderUsername: string; content: string }) => void;
}

export const useServerNotifications = ({
    serverId,
    userToken,
    onMemberJoined,
    onMemberLeft,
    onServerDeleted,
    onChannelAdded,
    onChannelRemoved,
    onChannelMessage
}: UseServerNotificationsProps) => {
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const serverSubRef = useRef<StompSubscription | null>(null);
    const channelsSubRef = useRef<StompSubscription | null>(null);
    const notificationsSubRef = useRef<StompSubscription | null>(null);

    // Use refs for callbacks
    const onMemberJoinedRef = useRef(onMemberJoined);
    const onMemberLeftRef = useRef(onMemberLeft);
    const onServerDeletedRef = useRef(onServerDeleted);
    const onChannelAddedRef = useRef(onChannelAdded);
    const onChannelRemovedRef = useRef(onChannelRemoved);
    const onChannelMessageRef = useRef(onChannelMessage);

    useEffect(() => {
        onMemberJoinedRef.current = onMemberJoined;
        onMemberLeftRef.current = onMemberLeft;
        onServerDeletedRef.current = onServerDeleted;
        onChannelAddedRef.current = onChannelAdded;
        onChannelRemovedRef.current = onChannelRemoved;
        onChannelMessageRef.current = onChannelMessage;
    }, [onMemberJoined, onMemberLeft, onServerDeleted, onChannelAdded, onChannelRemoved, onChannelMessage]);

    useEffect(() => {
        // Cleanup previous connection
        if (clientRef.current) {
            console.log("[ServerNotifications] Cleaning up previous connection...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (serverSubRef.current) {
                serverSubRef.current.unsubscribe();
                serverSubRef.current = null;
            }
            if (channelsSubRef.current) {
                channelsSubRef.current.unsubscribe();
                channelsSubRef.current = null;
            }
            if (notificationsSubRef.current) {
                notificationsSubRef.current.unsubscribe();
                notificationsSubRef.current = null;
            }
            clientRef.current.deactivate();
            clientRef.current = null;
        }

        if (!serverId || !userToken) {
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                console.log('[ServerNotifications STOMP]: ' + str);
            },
            onConnect: () => {
                const membersTopic = `/topic/server.${serverId}.members`;
                const serverTopic = `/topic/server.${serverId}`;
                const channelsTopic = `/topic/server.${serverId}.channels`;

                console.log(`[ServerNotifications] Connected. Subscribing to: ${membersTopic}, ${serverTopic}, ${channelsTopic}`);

                subscriptionRef.current = client.subscribe(membersTopic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);
                        console.log('[ServerNotifications] Received (members):', notification);

                        switch (notification.type) {
                            case 'MEMBER_JOINED':
                                if (onMemberJoinedRef.current && notification.payload?.member) {
                                    onMemberJoinedRef.current(notification.payload.member);
                                }
                                break;
                            case 'MEMBER_LEFT':
                                if (onMemberLeftRef.current && notification.payload) {
                                    onMemberLeftRef.current({
                                        userId: notification.payload.userId,
                                        username: notification.payload.username
                                    });
                                }
                                break;
                        }
                    } catch (error) {
                        console.error('[ServerNotifications] Failed to parse message:', error);
                    }
                });

                serverSubRef.current = client.subscribe(serverTopic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);
                        console.log('[ServerNotifications] Received (server):', notification);

                        if (notification.type === 'SERVER_DELETED') {
                            const deletedServerId = notification.payload?.serverId || serverId;
                            if (onServerDeletedRef.current) {
                                onServerDeletedRef.current(deletedServerId);
                            }
                        }
                    } catch (error) {
                        console.error('[ServerNotifications] Failed to parse server message:', error);
                    }
                });

                channelsSubRef.current = client.subscribe(channelsTopic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);
                        console.log('[ServerNotifications] Received (channels):', notification);

                        switch (notification.type) {
                            case 'CHANNEL_ADDED':
                                if (onChannelAddedRef.current && notification.payload?.channel) {
                                    onChannelAddedRef.current(notification.payload.channel);
                                }
                                break;
                            case 'CHANNEL_REMOVED':
                                if (onChannelRemovedRef.current && notification.payload?.channelId) {
                                    onChannelRemovedRef.current(notification.payload.channelId);
                                }
                                break;
                        }
                    } catch (error) {
                        console.error('[ServerNotifications] Failed to parse channel message:', error);
                    }
                });

                const notificationsTopic = `/topic/server.${serverId}.notifications`;
                notificationsSubRef.current = client.subscribe(notificationsTopic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);

                        if (notification.type === 'CHANNEL_MESSAGE_NOTIFICATION') {
                            if (onChannelMessageRef.current && notification.payload) {
                                onChannelMessageRef.current(notification.payload);
                            }
                        }
                    } catch (error) {
                        console.error('[ServerNotifications] Failed to parse notification message:', error);
                    }
                });
            },
            onDisconnect: () => {
                console.warn('[ServerNotifications] Disconnected');
            },
            onStompError: (frame) => {
                console.error('[ServerNotifications] Error:', frame.headers['message']);
                console.error('[ServerNotifications] Details:', frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log("[ServerNotifications] Deactivating...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (serverSubRef.current) {
                serverSubRef.current.unsubscribe();
                serverSubRef.current = null;
            }
            if (channelsSubRef.current) {
                channelsSubRef.current.unsubscribe();
                channelsSubRef.current = null;
            }
            if (notificationsSubRef.current) {
                notificationsSubRef.current.unsubscribe();
                notificationsSubRef.current = null;
            }
            if (client) {
                client.deactivate();
            }
        };
    }, [serverId, userToken]); // Callbacks removed from dependencies
};

