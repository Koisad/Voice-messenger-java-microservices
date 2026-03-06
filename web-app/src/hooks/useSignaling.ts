import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { api } from '../api/client';
import type { SignalMessage, User } from '../types';

interface UseSignalingProps {
    userToken?: string;
    currentUserId?: string;
    currentUsername?: string;
    onIncomingCall?: (from: string, fromUsername: string, offer: RTCSessionDescriptionInit, fromUser: User) => void;
    onCallAnswered?: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
    onCallEnded?: () => void;
}

export const useSignaling = ({
    userToken,
    currentUserId,
    // currentUsername, // Unused in STOMP implementation (backend sets it based on token)
    onIncomingCall,
    onCallAnswered,
    onIceCandidate,
    onCallEnded
}: UseSignalingProps) => {
    const [connected, setConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);

    // Use refs for callbacks to prevent reconnection when they change
    const onIncomingCallRef = useRef(onIncomingCall);
    const onCallAnsweredRef = useRef(onCallAnswered);
    const onIceCandidateRef = useRef(onIceCandidate);
    const onCallEndedRef = useRef(onCallEnded);

    useEffect(() => {
        onIncomingCallRef.current = onIncomingCall;
        onCallAnsweredRef.current = onCallAnswered;
        onIceCandidateRef.current = onIceCandidate;
        onCallEndedRef.current = onCallEnded;
    }, [onIncomingCall, onCallAnswered, onIceCandidate, onCallEnded]);

    useEffect(() => {
        if (!userToken || !currentUserId) return;

        console.log('[Signaling] Initializing STOMP connection...');

        const client = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws/signal`),
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: () => {
                // console.log('[Signaling STOMP]: ' + str); // Uncomment for debugging
            },
            onConnect: () => {
                console.log('[Signaling] Connected to STOMP');
                setConnected(true);

                // Subscribe to user-specific signaling queue
                client.subscribe('/user/queue/signal', async (msg) => {
                    try {
                        const signal: SignalMessage = JSON.parse(msg.body);
                        console.log('[Signaling] Received:', signal.type, 'From:', signal.sender);

                        switch (signal.type) {
                            case 'offer':
                                console.log('[Signaling] Processing offer from:', signal.sender);
                                if (onIncomingCallRef.current && signal.data) {
                                    // Fetch caller details since signal message only has sender ID
                                    try {
                                        const callerUser = await api.getUser(signal.sender);
                                        const senderName = callerUser.displayName || callerUser.username || "Unknown";

                                        console.log('[Signaling] Resolved caller:', senderName);
                                        onIncomingCallRef.current(signal.sender, senderName, signal.data as RTCSessionDescriptionInit, callerUser);
                                    } catch (err) {
                                        console.error('[Signaling] Failed to fetch caller details:', err);
                                        // Fallback if fetch fails
                                        const fallbackUser = { id: signal.sender, username: "Unknown", displayName: "Unknown" } as User;
                                        onIncomingCallRef.current(signal.sender, "Unknown", signal.data as RTCSessionDescriptionInit, fallbackUser);
                                    }
                                }
                                break;
                            case 'answer':
                                if (onCallAnsweredRef.current && signal.data) {
                                    onCallAnsweredRef.current(signal.data as RTCSessionDescriptionInit);
                                }
                                break;
                            case 'ice-candidate':
                                if (onIceCandidateRef.current && signal.data) {
                                    onIceCandidateRef.current(signal.data as RTCIceCandidateInit);
                                }
                                break;
                            case 'call-ended':
                            case 'hangup': // Handle both terms
                            case 'busy':
                                if (onCallEndedRef.current) {
                                    console.log('[Signaling] Remote ended call');
                                    onCallEndedRef.current();
                                }
                                break;
                        }
                    } catch (error) {
                        console.error('[Signaling] Failed to parse message:', error, msg.body);
                    }
                });
            },
            onDisconnect: () => {
                console.log('[Signaling] Disconnected');
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('[Signaling] Broker error:', frame.headers['message']);
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log('[Signaling] Deactivating client...');
            if (client) {
                client.deactivate();
            }
        };
    }, [userToken, currentUserId]);

    const sendSignal = useCallback((message: Omit<SignalMessage, 'sender'>) => {
        if (clientRef.current && clientRef.current.connected) {
            clientRef.current.publish({
                destination: '/app/signal',
                body: JSON.stringify({
                    type: message.type,
                    target: message.target, // Target User ID
                    data: message.data
                })
            });
            return true;
        }
        console.warn('[Signaling] Cannot send signal - disconnected');
        return false;
    }, []);

    return { connected, sendSignal };
};
