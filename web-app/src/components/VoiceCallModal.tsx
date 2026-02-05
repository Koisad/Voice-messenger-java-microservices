import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import type { CallStatus } from '../hooks/useWebRTCCall';
import './VoiceCallModal.css';

interface VoiceCallModalProps {
    status: CallStatus;
    remotePeer: { id: string; username: string } | null;
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

    useEffect(() => {
        if (remoteStream && audioRef.current) {
            audioRef.current.srcObject = remoteStream;
            // Explicitly attempt to play
            audioRef.current.play().catch(err => {
                console.error('[VoiceCallModal] Failed to play audio:', err);
            });
        }
    }, [remoteStream]);

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

    return (
        <div className="call-modal-overlay">
            <div className="call-modal">
                <div className="call-avatar-large" />

                <h2 className="call-username">{remotePeer?.username || 'Unknown'}</h2>

                <div className="call-status-text">
                    {status === 'calling' && 'Dzwonię...'}
                    {status === 'ringing' && 'Połączenie przychodzące'}
                    {status === 'connected' && formatDuration(callDuration)}
                    {status === 'ended' && 'Rozłączono'}
                </div>

                <div className="call-actions">
                    {status === 'ringing' ? (
                        <>
                            <button className="call-btn call-btn-accept" onClick={onAnswer}>
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
