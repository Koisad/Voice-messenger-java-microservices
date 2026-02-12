import { useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface UseAnalyticsReporterProps {
    serverId: string | null;
    userToken?: string | null;
}

/**
 * Hook that collects WebRTC network stats from the active LiveKit room
 * and sends them via STOMP to /app/analytics every 10 seconds.
 * Must be used INSIDE <LiveKitRoom> component tree.
 */
export const useAnalyticsReporter = ({ serverId, userToken }: UseAnalyticsReporterProps) => {
    const room = useRoomContext();
    const stompRef = useRef<Client | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!userToken || !serverId) return;

        // Create a dedicated STOMP client for analytics
        const stomp = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            reconnectDelay: 10000,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 0,
            debug: () => { }, // silent
        });

        stomp.onConnect = () => {
            console.log('[AnalyticsReporter] STOMP connected');
        };

        stomp.activate();
        stompRef.current = stomp;

        return () => {
            stomp.deactivate();
            stompRef.current = null;
        };
    }, [userToken, serverId]);

    useEffect(() => {
        if (!room || !serverId) return;

        const collectAndSend = async () => {
            const stomp = stompRef.current;
            if (!stomp || !stomp.connected) return;

            try {
                // Get sender stats from all published tracks
                const localParticipant = room.localParticipant;
                const trackPublications = Array.from(localParticipant.trackPublications.values());

                let totalRtt = 0;
                let totalJitter = 0;
                let totalPacketsLost = 0;
                let totalPacketsSent = 0;
                let statCount = 0;

                for (const pub of trackPublications) {
                    if (!pub.track) continue;
                    const sender = pub.track.sender;
                    if (!sender) continue;

                    const stats = await sender.getStats();
                    if (!stats) continue;

                    stats.forEach((report: any) => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            if (report.currentRoundTripTime !== undefined) {
                                totalRtt += report.currentRoundTripTime * 1000; // s -> ms
                                statCount++;
                            }
                        }
                        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                            if (report.packetsLost !== undefined) {
                                totalPacketsLost += report.packetsLost;
                            }
                            if (report.packetsSent !== undefined) {
                                totalPacketsSent += report.packetsSent;
                            }
                        }
                        if (report.type === 'remote-inbound-rtp') {
                            if (report.jitter !== undefined) {
                                totalJitter += report.jitter * 1000; // s -> ms
                                statCount++;
                            }
                            if (report.packetsLost !== undefined) {
                                totalPacketsLost += report.packetsLost;
                            }
                        }
                    });
                }

                // Also get receiver (incoming) stats
                const remoteParticipants = Array.from(room.remoteParticipants.values());
                for (const rp of remoteParticipants) {
                    const remotePubs = Array.from(rp.trackPublications.values());
                    for (const pub of remotePubs) {
                        if (!pub.track) continue;
                        const receiver = pub.track.receiver;
                        if (!receiver) continue;

                        const stats = await receiver.getStats();
                        if (!stats) continue;

                        stats.forEach((report: any) => {
                            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                                if (report.jitter !== undefined) {
                                    totalJitter += report.jitter * 1000;
                                    statCount++;
                                }
                                if (report.packetsLost !== undefined) {
                                    totalPacketsLost += report.packetsLost;
                                }
                                if (report.packetsReceived !== undefined) {
                                    totalPacketsSent += report.packetsReceived;
                                }
                            }
                        });
                    }
                }

                const avgRtt = statCount > 0 ? totalRtt / statCount : 0;
                const avgJitter = statCount > 0 ? totalJitter / statCount : 0;
                const lossRatio = totalPacketsSent > 0
                    ? (totalPacketsLost / (totalPacketsSent + totalPacketsLost)) * 100
                    : 0;

                const metric = {
                    serverId,
                    rtt: avgRtt > 0 ? avgRtt : null,
                    packetsLost: totalPacketsLost > 0 ? totalPacketsLost : null,
                    packetLossRatio: lossRatio > 0 ? lossRatio : null,
                    jitter: avgJitter > 0 ? avgJitter : null,
                    connectionType: 'livekit',
                    timestamp: Date.now(),
                };

                stomp.publish({
                    destination: '/app/analytics',
                    body: JSON.stringify(metric),
                });

                console.log('[AnalyticsReporter] Sent metric:', metric);
            } catch (err) {
                console.warn('[AnalyticsReporter] Failed to collect stats:', err);
            }
        };

        // Collect stats every 10 seconds
        intervalRef.current = setInterval(collectAndSend, 10_000);

        // Also collect once initially after a short delay
        const initialTimeout = setTimeout(collectAndSend, 5_000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            clearTimeout(initialTimeout);
        };
    }, [room, serverId]);
};
