import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import type { CallStatus } from '../hooks/useWebRTCCall';
import type { User } from '../types';
import './VoiceCallModal.css';

import { soundManager } from '../utils/SoundManager';

interface VoiceCallModalProps {
    status: CallStatus;
    remotePeer: { id: string; username: string; user?: User } | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    onAnswer?: () => void;
    onReject?: () => void;
    onEnd: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    status,
    remotePeer,
    remoteStream,
    localStream,
    onAnswer,
    onReject,
    onEnd
}) => {
    console.log('[VoiceCallModal] Render with status:', status);

    const [muted, setMuted] = React.useState(false);
    const [callDuration, setCallDuration] = React.useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const timerRef = useRef<number | null>(null);

    // Sound effects management
    useEffect(() => {
        if (status === 'ringing') {
            // Incoming call - Ringing sound
            soundManager.playRinging();
        } else if (status === 'calling') {
            // Outgoing call - Dial tone
            soundManager.playDialTone();
        } else if (status === 'connected') {
            // Call connected - Stop all sounds
            soundManager.stopAll();
        } else if (status === 'ended') {
            // Call ended - Play beep
            soundManager.playEndCall();
        } else {
            soundManager.stopAll();
        }

        return () => {
            // Cleanup on unmount or status change (handled by effect re-run)
            // But we only want to stop if the component unmounts or status changes to idle
            if (status === 'idle') {
                soundManager.stopAll();
            }
        };
    }, [status]);

    // Ensure sounds stop when modal closes
    useEffect(() => {
        return () => {
            soundManager.stopAll();
        };
    }, []);

    const tryPlayAudio = React.useCallback(() => {
        if (audioRef.current && audioRef.current.srcObject) {
            audioRef.current.play().catch(err => {
                console.warn('[VoiceCallModal] Audio play deferred (will retry on user gesture):', err.message);
            });
        }
    }, []);

    useEffect(() => {
        if (remoteStream && audioRef.current) {
            audioRef.current.srcObject = remoteStream;
            tryPlayAudio();
        }
    }, [remoteStream, tryPlayAudio]);

    // Retry play when call becomes connected (status change often follows user gesture)
    useEffect(() => {
        if (status === 'connected') {
            tryPlayAudio();
        }
    }, [status, tryPlayAudio]);

    useEffect(() => {
        if (status === 'connected') {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setCallDuration(0);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [status]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMuted(!audioTrack.enabled);
            }
        }
    };

    if (status === 'idle') return null;

    const displayName = remotePeer?.user?.displayName || remotePeer?.username || 'Unknown';
    const avatarUrl = remotePeer?.user?.avatarUrl;

    return (
        <div className="call-modal-overlay">
            <div className="call-modal">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="call-avatar-large" />
                ) : (
                    <div className="call-avatar-large">
                        {(displayName || "?").substring(0, 1).toUpperCase()}
                    </div>
                )}

                <h2 className="call-username">{displayName}</h2>

                <div className="call-status-text">
                    {status === 'calling' && 'Dzwonię...'}
                    {status === 'ringing' && 'Połączenie przychodzące'}
                    {status === 'connected' && formatDuration(callDuration)}
                    {status === 'ended' && 'Rozłączono'}
                </div>

                <div className="call-actions">
                    {status === 'ringing' ? (
                        <>
                            <button className="call-btn call-btn-accept" onClick={() => { onAnswer?.(); tryPlayAudio(); }}>
                                <Phone size={24} />
                            </button>
                            <button className="call-btn call-btn-reject" onClick={onReject}>
                                <PhoneOff size={24} />
                            </button>
                        </>
                    ) : (
                        <>
                            {status === 'connected' && (
                                <button
                                    className={`call-btn call-btn-mute ${muted ? 'active' : ''}`}
                                    onClick={toggleMute}
                                >
                                    {muted ? <MicOff size={24} /> : <Mic size={24} />}
                                </button>
                            )}
                            <button className="call-btn call-btn-end" onClick={onEnd}>
                                <PhoneOff size={24} />
                            </button>
                        </>
                    )}
                </div>

                <audio ref={audioRef} autoPlay />
            </div>
        </div>
    );
};
