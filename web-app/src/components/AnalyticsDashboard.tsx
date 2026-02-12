import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { NetworkMetric } from '../types';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { BarChart3, Activity, Wifi, Server } from 'lucide-react';
import './AnalyticsDashboard.css';

interface Props {
    serverId: string | null;      // App room ID
    userId: string;
    mediaServerUrl: string;       // LiveKit server URL
}

type TabMode = 'room' | 'user' | 'media';

interface ChartDataPoint {
    time: string;
    rtt: number | null;
    packetLossRatio: number | null;
    jitter: number | null;
    packetsLost: number | null;
}

const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const avg = (values: (number | null)[]): number => {
    const valid = values.filter((v): v is number => v !== null && v !== undefined);
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const sum = (values: (number | null)[]): number => {
    return values.filter((v): v is number => v !== null && v !== undefined).reduce((a, b) => a + b, 0);
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{
            background: '#1e1f22',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#f2f3f5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
            <div style={{ marginBottom: 6, color: '#949ba4', fontWeight: 600 }}>{label}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ color: '#949ba4' }}>{p.name}:</span>
                    <span style={{ fontWeight: 600 }}>{p.value !== null ? Number(p.value).toFixed(2) : '—'}</span>
                </div>
            ))}
        </div>
    );
};

export const AnalyticsDashboard: React.FC<Props> = ({ serverId, userId, mediaServerUrl }) => {
    const [tab, setTab] = useState<TabMode>('room');
    const [metrics, setMetrics] = useState<NetworkMetric[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'room' && serverId) {
                const data = await api.getRoomMetrics(serverId);
                setMetrics(data);
            } else if (tab === 'user') {
                const data = await api.getUserMetrics(userId);
                setMetrics(data);
            } else if (tab === 'media' && mediaServerUrl) {
                const data = await api.getServerMetrics(mediaServerUrl);
                setMetrics(data);
            } else {
                setMetrics([]);
            }
        } catch (err) {
            console.error('[Analytics] Failed to fetch metrics:', err);
            setMetrics([]);
        } finally {
            setLoading(false);
        }
    }, [tab, serverId, userId, mediaServerUrl]);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    // Prepare chart data
    const chartData: ChartDataPoint[] = metrics
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(m => ({
            time: formatTime(m.timestamp),
            rtt: m.rtt,
            packetLossRatio: m.packetLossRatio,
            jitter: m.jitter,
            packetsLost: m.packetsLost ? Number(m.packetsLost) : null
        }));

    // KPI calculations
    const avgRtt = avg(metrics.map(m => m.rtt));
    const avgLoss = avg(metrics.map(m => m.packetLossRatio));
    const avgJitter = avg(metrics.map(m => m.jitter));
    const totalLost = sum(metrics.map(m => m.packetsLost));

    const axisStyle = { fontSize: 11, fill: '#949ba4' };
    const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' };

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h2><BarChart3 size={22} /> Analityka Sieci</h2>
                <p>Metryki jakości połączenia z ostatniej godziny • Odświeżanie co 30s</p>
            </div>

            <div className="analytics-tabs">
                <button
                    className={`analytics-tab ${tab === 'room' ? 'active' : ''}`}
                    onClick={() => setTab('room')}
                >
                    <Wifi size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Pokój
                </button>
                <button
                    className={`analytics-tab ${tab === 'user' ? 'active' : ''}`}
                    onClick={() => setTab('user')}
                >
                    <Activity size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Moje Metryki
                </button>
                <button
                    className={`analytics-tab ${tab === 'media' ? 'active' : ''}`}
                    onClick={() => setTab('media')}
                >
                    <Server size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Media Serwer
                </button>
            </div>

            {loading ? (
                <div className="analytics-loading">
                    <div className="loading-spinner" />
                </div>
            ) : metrics.length === 0 ? (
                <div className="analytics-empty">
                    <div className="analytics-empty-icon">
                        <BarChart3 size={36} />
                    </div>
                    <h3>Brak danych</h3>
                    <p>
                        {tab === 'room' && !serverId
                            ? 'Wybierz pokój z listy, aby zobaczyć metryki.'
                            : 'Nie znaleziono metryk z ostatniej godziny. Dane pojawią się po nawiązaniu połączenia głosowego.'}
                    </p>
                </div>
            ) : (
                <div className="analytics-content">
                    {/* KPI Cards */}
                    <div className="analytics-kpi-grid">
                        <div className="analytics-kpi-card">
                            <div className="kpi-label">Średni RTT (Ping)</div>
                            <div className="kpi-value">
                                {avgRtt.toFixed(1)}
                                <span className="kpi-unit">ms</span>
                            </div>
                        </div>
                        <div className="analytics-kpi-card">
                            <div className="kpi-label">Utrata pakietów</div>
                            <div className="kpi-value">
                                {avgLoss.toFixed(2)}
                                <span className="kpi-unit">%</span>
                            </div>
                        </div>
                        <div className="analytics-kpi-card">
                            <div className="kpi-label">Średni Jitter</div>
                            <div className="kpi-value">
                                {avgJitter.toFixed(1)}
                                <span className="kpi-unit">ms</span>
                            </div>
                        </div>
                        <div className="analytics-kpi-card">
                            <div className="kpi-label">Pakiety utracone</div>
                            <div className="kpi-value">
                                {totalLost.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="analytics-charts-grid">
                        {/* RTT Chart */}
                        <div className="analytics-chart-card">
                            <h4 className="chart-title">
                                <span className="chart-title-dot blue" />
                                RTT (Ping) w czasie
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={chartData}>
                                    <CartesianGrid {...gridStyle} />
                                    <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit=" ms" width={60} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="rtt"
                                        name="RTT"
                                        stroke="#5b8def"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#5b8def', stroke: '#1e1f22', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Jitter Chart */}
                        <div className="analytics-chart-card">
                            <h4 className="chart-title">
                                <span className="chart-title-dot yellow" />
                                Jitter w czasie
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={chartData}>
                                    <CartesianGrid {...gridStyle} />
                                    <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit=" ms" width={60} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="jitter"
                                        name="Jitter"
                                        stroke="#f0a030"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#f0a030', stroke: '#1e1f22', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Packet Loss Chart — full width */}
                        <div className="analytics-chart-card full-width">
                            <h4 className="chart-title">
                                <span className="chart-title-dot red" />
                                Utrata pakietów (%) w czasie
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ed4245" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ed4245" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid {...gridStyle} />
                                    <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" width={50} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="packetLossRatio"
                                        name="Packet Loss"
                                        stroke="#ed4245"
                                        strokeWidth={2}
                                        fill="url(#lossGradient)"
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#ed4245', stroke: '#1e1f22', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
