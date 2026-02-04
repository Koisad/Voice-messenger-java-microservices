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
}

export const useChatSocket = ({ serverId, channelId, userToken, currentUserId, currentUsername }: UseChatSocketProps) => {
    const [socketMessages, setSocketMessages] = useState<ChatMessage[]>([]);
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);

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
            return;
        }

        setSocketMessages([]);

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

                subscriptionRef.current = client.subscribe(
                    `/topic/server.${serverId}.channel.${channelId}`,
                    (msg: Message) => {
                        try {
                            const messageBody: ChatMessage = JSON.parse(msg.body);
                            setSocketMessages((prev) => {
                                const isDuplicate = prev.some(m =>
                                    m.id === messageBody.id ||
                                    (m.senderId === messageBody.senderId &&
                                        m.content === messageBody.content &&
                                        m.timestamp === messageBody.timestamp)
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
