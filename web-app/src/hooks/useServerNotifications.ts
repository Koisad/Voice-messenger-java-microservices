import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface UseServerNotificationsProps {
    serverId: string | null;
    userToken?: string | null;
    onMemberJoined?: (member: { userId: string; username: string; role: string }) => void;
    onMemberLeft?: (data: { userId: string; username: string }) => void;
}

export const useServerNotifications = ({
    serverId,
    userToken,
    onMemberJoined,
    onMemberLeft
}: UseServerNotificationsProps) => {
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);

    // Use refs for callbacks
    const onMemberJoinedRef = useRef(onMemberJoined);
    const onMemberLeftRef = useRef(onMemberLeft);

    useEffect(() => {
        onMemberJoinedRef.current = onMemberJoined;
        onMemberLeftRef.current = onMemberLeft;
    }, [onMemberJoined, onMemberLeft]);

    useEffect(() => {
        // Cleanup previous connection
        if (clientRef.current) {
            console.log("[ServerNotifications] Cleaning up previous connection...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
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
                const topic = `/topic/server.${serverId}.members`;
                console.log(`[ServerNotifications] Connected. Subscribing to: ${topic}`);

                subscriptionRef.current = client.subscribe(topic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);
                        console.log('[ServerNotifications] Received:', notification);

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
            if (client) {
                client.deactivate();
            }
        };
    }, [serverId, userToken]); // Callbacks removed from dependencies
};
