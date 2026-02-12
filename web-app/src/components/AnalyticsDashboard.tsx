import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { NetworkMetric } from '../types';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import './AnalyticsDashboard.css';

interface Props {
    userId: string;
}

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

export const AnalyticsDashboard: React.FC<Props> = ({ userId }) => {
    const [metrics, setMetrics] = useState<NetworkMetric[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getUserMetrics(userId);
            setMetrics(data);
        } catch (err) {
            console.error('[Analytics] Failed to fetch metrics:', err);
            setMetrics([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

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
            rtt: m.rtt && m.rtt > 0 ? m.rtt : null,
            packetLossRatio: m.packetLossRatio !== null ? m.packetLossRatio : null,
            jitter: m.jitter !== null ? m.jitter : null,
            packetsLost: m.packetsLost !== null ? Number(m.packetsLost) : null
        }));

    // KPI calculations
    const avgRtt = avg(metrics.map(m => m.rtt));
    const avgLoss = avg(metrics.map(m => m.packetLossRatio));
    const avgJitter = avg(metrics.map(m => m.jitter));
    const totalLost = sum(metrics.map(m => m.packetsLost));

    const axisStyle = { fontSize: 11, fill: '#949ba4' };
    const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' };

    // MOS Calculation (Simplified E-Model)
    const calculateMOS = (rtt: number, jitter: number, loss: number): number => {
        // R-Factor base for G.711 is ~93.2
        let R = 93.2;

        // Effective Latency: RTT + Jitter buffer (2 * jitter)
        const effectiveLatency = rtt + (jitter * 2);

        // Delay Impairment (Id)
        let Id = 0;
        if (effectiveLatency < 160) {
            Id = effectiveLatency / 40;
        } else {
            Id = (effectiveLatency - 120) / 10;
        }

        // Equipment Impairment (Ie) due to packet loss
        // standard approximation for packet loss impact
        const Ie = 30 * Math.log(1 + 15 * loss);

        // Calculate R
        R = R - Id - Ie;

        // Clamp R
        if (R < 0) R = 0;
        if (R > 100) R = 100;

        // Convert R to MOS
        let mos = 1;
        if (R > 80) {
            mos = R / 23.4 + 0.7; // Linear Approx for high quality
            if (mos > 4.5) mos = 4.5; // Max MOS is usually 4.5 (or 5 theoretical)
        } else if (R > 6.5) {
            mos = 1 + (0.035) * R + (R * (R - 60) * (100 - R) * 7e-6);
        }

        // Clamp MOS 1-5
        if (mos < 1) mos = 1;
        if (mos > 5) mos = 5;

        return mos;
    };

    const mosScore = calculateMOS(avgRtt, avgJitter, avgLoss);

    const mosClass = (score: number) => {
        if (score >= 4.0) return '#23a559'; // Green
        if (score >= 3.0) return '#f0a030'; // Yellow
        if (score >= 2.0) return '#f23f43'; // Red
        return '#ed4245';
    };

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h2><BarChart3 size={22} /> Metryki sieci użytkownika</h2>
            </div>

            {loading && metrics.length === 0 ? (
                <div className="analytics-loading">
                    <div className="loading-spinner" />
                </div>
            ) : metrics.length === 0 ? (
                <div className="analytics-empty">
                    <div className="analytics-empty-icon">
                        <BarChart3 size={36} />
                    </div>
                    <h3>Brak danych</h3>
                    <p>Nie znaleziono metryk z ostatniej godziny. Dane pojawią się po nawiązaniu połączenia głosowego.</p>
                </div>
            ) : (
                <div className="analytics-content">
                    {/* KPI Cards */}
                    <div className="analytics-kpi-grid">
                        <div className="analytics-kpi-card" style={{ borderLeft: `3px solid ${mosClass(mosScore)}` }}>
                            <div className="kpi-label">Ocena Sieci (MOS)</div>
                            <div className="kpi-value" style={{ color: mosClass(mosScore) }}>
                                {mosScore.toFixed(2)}
                                <span className="kpi-unit">/ 5.0</span>
                            </div>
                        </div>
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
                                        type="linear"
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
                                        type="stepAfter"
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
