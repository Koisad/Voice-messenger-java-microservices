import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { NetworkMetric } from '../types';
import { BarChart3, Wifi, Server, ChevronDown, Info } from 'lucide-react';
import './ServerAnalyticsPanel.css';

interface Props {
    serverId: string | null;
    mediaServerUrl: string;
    currentUserId?: string;
}

type PanelTab = 'room' | 'media';

const avg = (values: (number | null)[]): number => {
    const valid = values.filter((v): v is number => v !== null && v !== undefined);
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
};

function rttClass(v: number): string {
    if (v <= 0) return '';
    if (v < 50) return 'good';
    if (v < 150) return 'warn';
    return 'bad';
}

function lossClass(v: number): string {
    if (v <= 0) return '';
    if (v < 1) return 'good';
    if (v < 5) return 'warn';
    return 'bad';
}

function jitterClass(v: number): string {
    if (v <= 0) return '';
    if (v < 20) return 'good';
    if (v < 50) return 'warn';
    return 'bad';
}

export const ServerAnalyticsPanel: React.FC<Props> = ({ serverId, mediaServerUrl, currentUserId }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<PanelTab>('room');
    const [metrics, setMetrics] = useState<NetworkMetric[]>([]);
    const [loading, setLoading] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        const tooltipWidth = 340;
        const offset = 15;
        const windowWidth = window.innerWidth;

        let x = e.clientX + offset;
        if (x + tooltipWidth > windowWidth) {
            x = e.clientX - tooltipWidth - offset;
        }

        setTooltipPos({ x, y: e.clientY });
    };

    const fetchMetrics = useCallback(async () => {
        try {
            setLoading(true);
            if (tab === 'room' && serverId) {
                const data = await api.getRoomMetrics(serverId);
                setMetrics(data);
            } else if (tab === 'media' && mediaServerUrl) {
                const data = await api.getServerMetrics(mediaServerUrl);
                setMetrics(data);
            } else {
                setMetrics([]);
            }
        } catch (err) {
            console.error('[ServerAnalyticsPanel] fetch error:', err);
            setMetrics([]);
        } finally {
            setLoading(false);
        }
    }, [tab, serverId, mediaServerUrl]);

    // Auto-refresh only when panel is open
    useEffect(() => {
        if (!open) return;

        fetchMetrics();
        fetchMetrics();
        intervalRef.current = setInterval(fetchMetrics, 3000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [open, fetchMetrics]);

    // Filter metrics to last 25 seconds relative to the LATEST metric we have, 
    // NOT relative to client's Date.now() (which might be wrong).
    const recentMetrics = (() => {
        if (metrics.length === 0) return [];

        // precise timestamp from server
        // sort first just in case
        const sorted = [...metrics].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const latestTime = new Date(sorted[0].timestamp).getTime();
        const cutoff = latestTime - 25000;

        return sorted.filter(m => new Date(m.timestamp).getTime() > cutoff);
    })();

    // If no recent metrics, use all metrics (fallback) or show 0? 
    // Ideally if connected we have data. If not, 0 is fine.
    // Spec: "ping jumps" -> user wants reactivity. 
    // If recentMetrics is empty but we have old data, showing old data is misleading (it's "stuck").
    // So better to show 0 or "—" if no recent data (implies disconnected/idle).
    // The 'avg' function returns 0 if empty.

    // Use recentMetrics for calculation
    // If tab is 'room', we show specific user stats (My Connection)
    // If tab is 'media', we show server averages (Infrastructure Health)
    const metricsToDisplay = (tab === 'room' && currentUserId)
        ? recentMetrics.filter(m => m.metadata?.userId === currentUserId)
        : recentMetrics;

    const avgRtt = avg(metricsToDisplay.map(m => m.rtt));
    const avgLoss = avg(metricsToDisplay.map(m => m.packetLossRatio));
    const avgJitter = avg(metricsToDisplay.map(m => m.jitter));

    const tabTooltips: Record<string, string> = {
        'room': 'Statystyki twojego połączenia z serwerem głosowym',
        'media': 'Średnie parametry sieciowe wszystkich użytkowników podłączonych do twojego serwera głosowego'
    };

    return (
        <div className="server-analytics-panel" onMouseMove={handleMouseMove}>
            <div className="server-analytics-header" onClick={() => setOpen(!open)}>
                <h4>
                    <BarChart3 size={12} />
                    Analityka
                </h4>
                <ChevronDown size={14} className={`server-analytics-chevron ${open ? 'open' : ''}`} />
            </div>

            {open && (
                <div className="server-analytics-body">
                    <div className="server-analytics-tabs">
                        <button
                            className={`server-analytics-tab ${tab === 'room' ? 'active' : ''}`}
                            onClick={() => setTab('room')}
                            onMouseEnter={() => setHoveredTab('room')}
                            onMouseLeave={() => setHoveredTab(null)}
                        >
                            <Wifi size={10} /> Użytkownik <Info size={10} className="info-icon" />
                        </button>
                        <button
                            className={`server-analytics-tab ${tab === 'media' ? 'active' : ''}`}
                            onClick={() => setTab('media')}
                            onMouseEnter={() => setHoveredTab('media')}
                            onMouseLeave={() => setHoveredTab(null)}
                        >
                            <Server size={10} /> Serwer <Info size={10} className="info-icon" />
                        </button>
                    </div>

                    {hoveredTab && tabTooltips[hoveredTab] && (
                        <div
                            className="kpi-tooltip-overlay"
                            style={{
                                top: tooltipPos.y + 12, // Slight offset to avoid cursor overlap
                                left: tooltipPos.x,
                                zIndex: 9999
                            }}
                        >
                            {tabTooltips[hoveredTab]}
                        </div>
                    )}

                    {loading && metrics.length === 0 ? (
                        <div className="server-analytics-loading">
                            <span className="mini-spinner" /> Ładowanie...
                        </div>
                    ) : metrics.length === 0 ? (
                        <div className="server-analytics-empty">
                            Brak danych — dołącz do kanału głosowego
                        </div>
                    ) : (
                        <div className="server-analytics-kpis">
                            <div className={`server-analytics-kpi ${rttClass(avgRtt)}`}>
                                <div className="kpi-label">RTT</div>
                                <div className="kpi-val">
                                    {avgRtt > 0 ? avgRtt.toFixed(0) : '—'}
                                    <span className="unit">ms</span>
                                </div>
                            </div>
                            <div className={`server-analytics-kpi ${lossClass(avgLoss)}`}>
                                <div className="kpi-label">Strata</div>
                                <div className="kpi-val">
                                    {avgLoss.toFixed(1)}
                                    <span className="unit">%</span>
                                </div>
                            </div>
                            <div className={`server-analytics-kpi ${jitterClass(avgJitter)}`}>
                                <div className="kpi-label">Jitter</div>
                                <div className="kpi-val">
                                    {avgJitter.toFixed(0)}
                                    <span className="unit">ms</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
