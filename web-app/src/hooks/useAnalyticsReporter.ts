import { useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Client } from '@stomp/stompjs';


interface UseAnalyticsReporterProps {
    roomId: string | null;        // App server ID (discord-like room)
    mediaServerUrl: string;       // LiveKit server URL (media server identifier)
    userToken?: string | null;
}

/**
 * Returns the real network connection type from Navigator.connection API.
 */
function getConnectionType(): string {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!conn) return 'unknown';
    return conn.type || conn.effectiveType || 'unknown';
}

/**
 * Extracts RTCPeerConnection(s) from the LiveKit Room engine.
 */
function getPeerConnections(room: any): RTCPeerConnection[] {
    const pcs: RTCPeerConnection[] = [];
    try {
        const engine = room.engine;
        if (!engine) return pcs;

        const pcManager = engine.pcManager;
        if (pcManager) {
            if (pcManager.publisher?.pc) pcs.push(pcManager.publisher.pc);
            if (pcManager.subscriber?.pc) pcs.push(pcManager.subscriber.pc);
        }

        if (pcs.length === 0) {
            if (engine.publisher?.pc) pcs.push(engine.publisher.pc);
            if (engine.subscriber?.pc) pcs.push(engine.subscriber.pc);
        }
    } catch (e) {
        console.warn('[AnalyticsReporter] Could not access PeerConnections:', e);
    }
    return pcs;
}

/**
 * Hook that collects WebRTC network stats from the active LiveKit room
 * and sends them via STOMP to /app/analytics every 10 seconds.
 * Must be used INSIDE <LiveKitRoom> component tree.
 */
export const useAnalyticsReporter = ({ roomId, mediaServerUrl, userToken }: UseAnalyticsReporterProps) => {
    const room = useRoomContext();
    const stompRef = useRef<Client | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // STOMP connection
    useEffect(() => {
        if (!userToken || !roomId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const stomp = new Client({
            brokerURL: `${protocol}://${window.location.host}/ws/websocket`,
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            reconnectDelay: 10000,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 0,
            debug: () => { },
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
    }, [userToken, roomId]);

    // Stats collection
    useEffect(() => {
        if (!room || !roomId) return;

        const collectAndSend = async () => {
            const stomp = stompRef.current;
            if (!stomp || !stomp.connected) return;

            try {
                const pcs = getPeerConnections(room);
                if (pcs.length === 0) {
                    console.warn('[AnalyticsReporter] No PeerConnections found');
                    return;
                }

                let rttSum = 0;
                let rttCount = 0;
                let jitterSum = 0;
                let jitterCount = 0;
                let totalPacketsLost = 0;
                let totalPackets = 0;

                let protocol = 'unknown';

                for (const pc of pcs) {
                    const stats = await pc.getStats();

                    stats.forEach((report: any) => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            // Attempt to get protocol from local candidate
                            const localCandidate = stats.get(report.localCandidateId);
                            if (localCandidate && localCandidate.protocol) {
                                protocol = localCandidate.protocol.toUpperCase();
                            }

                            if (typeof report.currentRoundTripTime === 'number' && report.currentRoundTripTime > 0) {
                                rttSum += report.currentRoundTripTime * 1000;
                                rttCount++;
                            }
                        }

                        if (report.type === 'outbound-rtp') {
                            if (typeof report.packetsSent === 'number') {
                                totalPackets += report.packetsSent;
                            }
                        }

                        if (report.type === 'inbound-rtp') {
                            if (typeof report.jitter === 'number') {
                                jitterSum += report.jitter * 1000;
                                jitterCount++;
                            }
                            if (typeof report.packetsLost === 'number') {
                                totalPacketsLost += report.packetsLost;
                            }
                            if (typeof report.packetsReceived === 'number') {
                                totalPackets += report.packetsReceived;
                            }
                        }

                        if (report.type === 'remote-inbound-rtp') {
                            if (typeof report.jitter === 'number') {
                                jitterSum += report.jitter * 1000;
                                jitterCount++;
                            }
                            if (typeof report.packetsLost === 'number') {
                                totalPacketsLost += report.packetsLost;
                            }
                            if (typeof report.roundTripTime === 'number' && report.roundTripTime > 0) {
                                rttSum += report.roundTripTime * 1000;
                                rttCount++;
                            }
                        }
                    });
                }

                const avgRtt = rttCount > 0 ? rttSum / rttCount : null;
                const avgJitter = jitterCount > 0 ? jitterSum / jitterCount : null;
                const lossRatio = totalPackets > 0
                    ? (totalPacketsLost / (totalPackets + totalPacketsLost)) * 100
                    : null;

                // Default to 0 if we have RTT (active connection) but no other stats
                // This happens when just connected or idle
                const hasConnection = avgRtt !== null;
                const finalJitter = avgJitter !== null ? avgJitter : (hasConnection ? 0 : null);
                const finalLossRatio = lossRatio !== null ? lossRatio : (hasConnection ? 0 : null);
                const finalPacketsLost = totalPacketsLost; // 0 is valid

                const metric = {
                    serverId: mediaServerUrl,   // LiveKit server = media server
                    roomId,                      // App server = room
                    rtt: avgRtt,
                    packetsLost: finalPacketsLost,
                    packetLossRatio: finalLossRatio,
                    jitter: finalJitter,
                    connectionType: `${getConnectionType()} (${protocol})`,
                    timestamp: Date.now(),
                };

                console.log('[AnalyticsReporter] Metric:', metric);

                if (avgRtt !== null) { // Send if we have at least RTT
                    stomp.publish({
                        destination: '/app/analytics',
                        body: JSON.stringify(metric)
                    });
                }
            } catch (err) {
                console.warn('[AnalyticsReporter] Failed to collect stats:', err);
            }
        };

        const initialTimeout = setTimeout(collectAndSend, 2_000);
        intervalRef.current = setInterval(collectAndSend, 3_000);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [room, roomId, mediaServerUrl]);
};
