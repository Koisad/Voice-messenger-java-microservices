import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Message as ChatMessage } from '../types';

interface UseChatSocketProps {
    serverId: string | null;
    channelId: string | null;
    userToken?: string | null;
    currentUserId?: string;
    currentUsername?: string;
    onReconnect?: () => void;
}

export const useChatSocket = ({ serverId, channelId, userToken, currentUserId, currentUsername, onReconnect }: UseChatSocketProps) => {
    const [socketMessages, setSocketMessages] = useState<ChatMessage[]>([]);
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const prevChannelRef = useRef<string | null>(null);
    const isFirstConnectRef = useRef(true);
    const onReconnectRef = useRef(onReconnect);
    onReconnectRef.current = onReconnect;

    useEffect(() => {
        // Cleanup poprzedniego połączenia
        if (clientRef.current) {
            console.log("Cleaning up previous WebSocket connection...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            clientRef.current.deactivate();
            clientRef.current = null;
        }

        if (!serverId || !channelId || !userToken) {
            setSocketMessages([]);
            prevChannelRef.current = null;
            isFirstConnectRef.current = true;
            return;
        }

        // Only reset socket messages when the channel actually changes
        const channelChanged = prevChannelRef.current !== channelId;
        if (channelChanged) {
            setSocketMessages([]);
            prevChannelRef.current = channelId;
            isFirstConnectRef.current = true;
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
                console.log('[STOMP]: ' + str);
            },
            onConnect: () => {
                console.log(`Connected to STOMP. Subscribing to: /topic/server.${serverId}.channel.${channelId}`);

                // On reconnect (not first connect), re-fetch history to fill any gaps
                if (!isFirstConnectRef.current) {
                    console.log('[STOMP] Reconnected — refreshing message history');
                    onReconnectRef.current?.();
                }
                isFirstConnectRef.current = false;

                subscriptionRef.current = client.subscribe(
                    `/topic/server.${serverId}.channel.${channelId}`,
                    (msg: Message) => {
                        try {
                            const messageBody: ChatMessage = JSON.parse(msg.body);
                            setSocketMessages((prev) => {
                                // If message with same id exists, update it (e.g. isToxic flag)
                                const existingIndex = prev.findIndex(m => m.id === messageBody.id);
                                if (existingIndex !== -1) {
                                    const updated = [...prev];
                                    updated[existingIndex] = messageBody;
                                    return updated;
                                }
                                // Check for duplicate by content+sender+timestamp
                                const isDuplicate = prev.some(m =>
                                    m.senderId === messageBody.senderId &&
                                    m.content === messageBody.content &&
                                    m.timestamp === messageBody.timestamp
                                );
                                return isDuplicate ? prev : [...prev, messageBody];
                            });
                        } catch (error) {
                            console.error('Failed to parse WebSocket message:', error, msg.body);
                        }
                    }
                );
            },
            onDisconnect: () => {
                console.warn('WebSocket disconnected');
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log("Deactivating STOMP client...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (client) {
                client.deactivate();
            }
        };
    }, [serverId, channelId, userToken]);

    const sendMessage = (content: string) => {
        if (!currentUserId) {
            console.error('Cannot send message: currentUserId is missing');
            return false;
        }

        if (clientRef.current && clientRef.current.connected && serverId && channelId && userToken) {
            clientRef.current.publish({
                destination: `/app/send/${serverId}/${channelId}`,
                headers: {
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    username: currentUsername,
                    content: content
                }),
            });
            return true;
        }
        return false;
    };

    return { socketMessages, sendMessage };
};
