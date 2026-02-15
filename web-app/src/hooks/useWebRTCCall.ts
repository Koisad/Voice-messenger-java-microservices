import { useState, useRef, useCallback, useEffect } from 'react';
import { useSignaling } from './useSignaling';
import type { User } from '../types';

interface UseWebRTCCallProps {
    userToken?: string;
    currentUserId?: string;
    currentUsername?: string;
}

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export const useWebRTCCall = ({ userToken, currentUserId, currentUsername }: UseWebRTCCallProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [remotePeer, setRemotePeer] = useState<{ id: string; username: string; user?: User } | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const onIncomingCall = useCallback(async (from: string, fromUsername: string, offer: RTCSessionDescriptionInit, fromUser: User) => {
        console.log('[WebRTC] onIncomingCall triggered! From:', from, 'Username:', fromUsername);
        try {
            setRemotePeer({ id: from, username: fromUsername, user: fromUser });
            setCallStatus('ringing');
            console.log('[WebRTC] Call status set to ringing');

            // Store offer to accept later
            pcRef.current = createPeerConnection(from);
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] Remote description set');
        } catch (error) {
            console.error('[WebRTC] Error in onIncomingCall:', error);
            endCall();
        }
    }, []);

    const onCallAnswered = useCallback(async (answer: RTCSessionDescriptionInit) => {
        if (pcRef.current) {
            try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                setCallStatus('connected');
            } catch (err) {
                console.error('[WebRTC] Error setting remote description (answer):', err);
            }
        }
    }, []);

    const onIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        if (pcRef.current) {
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('[WebRTC] Error adding ice candidate:', err);
            }
        }
    }, []);

    const onCallEnded = useCallback(() => {
        console.log('[WebRTC] Call ended by remote');
        // IMPORTANT: Immediate cleanup on frontend when we receive signal
        cleanupCall();
    }, []);

    const { connected, sendSignal } = useSignaling({
        userToken,
        currentUserId,
        currentUsername,
        onIncomingCall,
        onCallAnswered,
        onIceCandidate,
        onCallEnded
    });

    const createPeerConnection = (targetUserId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice-candidate',
                    target: targetUserId,
                    data: event.candidate.toJSON()
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track');
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setCallStatus('connected');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                // Do not auto-close here if it's just a flicker, but usually for P2P 'failed' means end.
                if (pc.connectionState === 'failed') {
                    cleanupCall();
                }
            }
        };

        return pc;
    };

    const startCall = async (targetUserId: string, targetUsername: string, targetUser?: User) => {
        try {
            setRemotePeer({ id: targetUserId, username: targetUsername, user: targetUser });
            setCallStatus('calling');

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            // Create peer connection
            const pc = createPeerConnection(targetUserId);
            pcRef.current = pc;

            // Add audio track
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sent = sendSignal({
                type: 'offer',
                target: targetUserId,
                data: offer
            });

            if (!sent) {
                throw new Error("Błąd połączenia z serwerem sygnałowym (Signaling Disconnected)");
            }
        } catch (err) {
            console.error('[WebRTC] Failed to start call:', err);
            cleanupCall();
        }
    };

    const answerCall = async () => {
        if (!pcRef.current || !remotePeer) return;

        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            // Add audio track
            stream.getTracks().forEach(track => {
                pcRef.current!.addTrack(track, stream);
            });

            // Create and send answer
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            sendSignal({
                type: 'answer',
                target: remotePeer.id,
                data: answer
            });

            setCallStatus('connected');
        } catch (err) {
            console.error('[WebRTC] Failed to answer call:', err);
            cleanupCall();
        }
    };

    const rejectCall = () => {
        if (remotePeer) {
            // Send hangup signal immediately
            sendSignal({
                type: 'hangup',
                target: remotePeer.id
            });
        }
        cleanupCall();
    };

    const endCall = () => {
        if (remotePeer) {
            sendSignal({
                type: 'hangup',
                target: remotePeer.id
            });
        }
        cleanupCall();
    };

    // Internal cleanup function ensuring state is reset
    const cleanupCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        setRemoteStream(null);
        setRemotePeer(null);
        setCallStatus('idle');
    };

    // Handle tab close / refresh
    const remotePeerRef = useRef(remotePeer);
    useEffect(() => {
        remotePeerRef.current = remotePeer;
    }, [remotePeer]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const peer = remotePeerRef.current;
            if (peer) {
                // Try to best-effort send hangup
                sendSignal({
                    type: 'hangup',
                    target: peer.id
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [sendSignal]);

    return {
        callStatus,
        remotePeer,
        localStream,
        remoteStream,
        signalingConnected: connected,
        startCall,
        answerCall,
        rejectCall,
        endCall
    };
};
