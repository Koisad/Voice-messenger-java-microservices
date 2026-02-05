import { useEffect, useRef, useState, useCallback } from 'react';
import type { SignalMessage } from '../types';

interface UseSignalingProps {
    userToken?: string;
    currentUserId?: string;
    currentUsername?: string;
    onIncomingCall?: (from: string, fromUsername: string, offer: RTCSessionDescriptionInit) => void;
    onCallAnswered?: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
    onCallEnded?: () => void;
}

export const useSignaling = ({
    userToken,
    currentUserId,
    currentUsername,
    onIncomingCall,
    onCallAnswered,
    onIceCandidate,
    onCallEnded
}: UseSignalingProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    // Use refs for callbacks to prevent WebSocket reconnection when they change
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
        if (!userToken || !currentUserId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/signal?access_token=${userToken}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[Signaling] Connected');
            setConnected(true);
        };

        ws.onclose = () => {
            console.log('[Signaling] Disconnected');
            setConnected(false);
        };

        ws.onerror = (error) => {
            console.error('[Signaling] Error:', error);
        };

        ws.onmessage = (event) => {
            try {
                const message: SignalMessage = JSON.parse(event.data);
                console.log('[Signaling] Received:', message.type);

                switch (message.type) {
                    case 'offer':
                        console.log('[Signaling] Processing offer from:', message.sender, 'Username:', message.senderUsername);
                        if (onIncomingCallRef.current && message.data) {
                            console.log('[Signaling] Calling onIncomingCall callback');
                            onIncomingCallRef.current(message.sender, message.senderUsername || message.sender, message.data);
                        } else {
                            console.warn('[Signaling] onIncomingCall callback not defined or no message data');
                        }
                        break;
                    case 'answer':
                        if (onCallAnsweredRef.current && message.data) {
                            onCallAnsweredRef.current(message.data);
                        }
                        break;
                    case 'ice-candidate':
                        if (onIceCandidateRef.current && message.data) {
                            onIceCandidateRef.current(message.data);
                        }
                        break;
                    case 'call-ended':
                        if (onCallEndedRef.current) {
                            onCallEndedRef.current();
                        }
                        break;
                }
            } catch (err) {
                console.error('[Signaling] Parse error:', err);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [userToken, currentUserId]); // Removed callbacks from dependencies

    const sendSignal = useCallback((message: Omit<SignalMessage, 'sender'>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                ...message,
                senderUsername: currentUsername
            }));
            return true;
        }
        return false;
    }, [currentUsername]);

    return { connected, sendSignal };
};
