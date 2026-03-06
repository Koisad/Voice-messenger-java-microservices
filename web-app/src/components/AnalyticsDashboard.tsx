import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { NetworkMetric } from '../types';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { BarChart3, Info } from 'lucide-react';
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
    const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const tooltipWidth = 340; // 320px width + 20px padding/border approx
        const offset = 15; // Space from cursor
        const windowWidth = window.innerWidth;

        // If tooltip would go off-screen to the right, show it on the left
        let x = e.clientX + offset;
        if (x + tooltipWidth > windowWidth) {
            x = e.clientX - tooltipWidth - offset;
        }

        setTooltipPos({ x, y: e.clientY });
    };

    const kpiDescriptions: Record<string, string> = {
        mos: "MOS (Mean Opinion Score) to uniwersalna ocena jakości rozmowy w skali od 1 do 5, gdzie 5 oznacza krystalicznie czysty dźwięk porównywalny z rozmową twarzą w twarz, a 1 brak możliwości porozumienia. Jest to wskaźnik syntetyczny, wyliczany automatycznie na podstawie opóźnień, jittera oraz utraty pakietów, który najlepiej oddaje subiektywne wrażenia użytkownika. Wynik powyżej 4.0 gwarantuje komfortową konwersację, natomiast wartości poniżej 3.5 mogą sugerować problemy ze zrozumieniem rozmówcy, metaliczny pogłos lub rwanie sygnału. To najważniejsza metryka dla szybkiej oceny ogólnego zdrowia połączenia głosowego.",
        rtt: "RTT (Round Trip Time), potocznie nazywany pingiem, określa czas w milisekundach, jaki potrzebuje pakiet danych na dotarcie do serwera i powrót do Twojego urządzenia. Im niższa wartość, tym bardziej płynna i naturalna jest rozmowa, ponieważ opóźnienie między wypowiedzeniem słowa a jego usłyszeniem jest niezauważalne. Dla komfortowych połączeń VoIP wartość ta powinna wynosić poniżej 150 ms; wyższe opóźnienia mogą powodować irytujące zjawisko \"wchodzenia sobie w słowo\" i nienaturalne pauzy w dialogu. Wysoki RTT często wynika z dużej odległości fizycznej od serwera, słabego zasięgu WiFi lub przeciążenia łącza internetowego.",
        loss: "Utrata pakietów wyrażona w procentach informuje, jaka część danych głosowych wysłanych przez nadawcę nigdy nie dotarła do odbiorcy. Nawet niewielka utrata rzędu 1-3% może być maskowana przez algorytmy naprawcze, jednak wyższe wartości prowadzą do \"robotycznego\" głosu, ucinania sylab lub całkowitych przerw w dźwięku. Jest to jeden z najbardziej krytycznych parametrów dla jakości audio, często spowodowany niestabilnym połączeniem WiFi lub przeciążeniem sieci lokalnej. W idealnych warunkach wskaźnik ten powinien wynosić 0%, a wartości powyżej 5% zwykle uniemożliwiają normalną komunikację.",
        jitter: "Jitter to zmienność opóźnienia pakietów, czyli miara stabilności Twojego połączenia internetowego. Gdy pakiety docierają do odbiorcy w nieregularnych odstępach czasu – raz szybciej, raz wolniej – powstają \"korki\" lub luki w strumieniu audio. Aplikacja próbuje to naprawić, stosując bufor, ale przy wysokim jitterze może to skutkować nagłym przyspieszaniem dźwięku, zniekształceniami lub dodatkowym opóźnieniem. Niski jitter (poniżej 30 ms) oznacza stabilne łącze, podczas gdy wysokie skoki często występują przy korzystaniu z Internetu mobilnego (LTE/5G) lub zatłoczonych sieci bezprzewodowych.",
        lost: "Całkowita liczba utraconych pakietów to sumaryczny licznik wszystkich fragmentów danych, które zaginęły w sieci od początku trwania połączenia. W przeciwieństwie do wskaźnika procentowego (który pokazuje aktualny stan „tu i teraz”), ta wartość pozwala ocenić stabilność łącza w dłuższym okresie czasu. Nagły przyrost tej liczby wskazuje na chwilowe problemy z siecią, np. moment przełączenia się między nadajnikami WiFi lub chwilowe \"czknięcie\" routera. Monitorowanie tego parametru pomaga zdiagnozować, czy problemy z jakością są incydentalne, czy też wynikają z ciągłej, słabej kondycji infrastruktury sieciowej."
    };

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
        // 1. One-way delay to podstawa obliczeń (uproszczenie: RTT / 2)
        // Dodajemy jitter buffer (zwykle 2x jitter)
        const effectiveLatency = (rtt / 2) + (jitter * 2) + 10; // +10ms na procesing

        // 2. Base R-Factor dla kodeka G.711 (najlepsza możliwa jakość)
        let R = 94.2;

        // 3. Delay Impairment (Id) - wpływ opóźnienia
        let Id = 0;
        if (effectiveLatency < 160) {
            Id = effectiveLatency / 40;
        } else {
            Id = (effectiveLatency - 120) / 10;
        }

        // 4. Equipment Impairment (Ie) - wpływ utraty pakietów
        // loss musi być ułamkiem (np. 0.01 dla 1%)
        // Jeśli Twoje DTO wysyła procenty (1-100), użyj: (loss / 100)
        const lossProbability = loss > 1 ? loss / 100 : loss;
        const Ie = 30 * Math.log(1 + 15 * lossProbability);

        // 5. Finalny R-Factor
        R = R - Id - Ie;

        // Clamp R-Factor do zakresu 0-100
        R = Math.max(0, Math.min(100, R));

        // 6. Konwersja R-Factor na MOS (Standard ITU-T G.107)
        // To jest oficjalna krzywa mapowania
        let mos = 1 + (0.035 * R) + (R * (R - 60) * (100 - R) * 0.000007);

        // Clamp MOS do zakresu 1.0 - 4.5
        // (Wartość 4.5 jest max dla G.711 ze względu na kompresję cyfrową)
        return parseFloat(Math.max(1, Math.min(4.5, mos)).toFixed(2));
    };

    const mosScore = calculateMOS(avgRtt, avgJitter, avgLoss);

    const mosClass = (score: number) => {
        if (score >= 4.0) return '#23a559'; // Green
        if (score >= 3.0) return '#f0a030'; // Yellow
        if (score >= 2.0) return '#f23f43'; // Red
        return '#ed4245';
    };

    return (
        <div className="analytics-dashboard" onMouseMove={handleMouseMove}>
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

                        {/* MOS */}
                        <div
                            className="analytics-kpi-card"
                            style={{ borderLeft: `3px solid ${mosClass(mosScore)}` }}
                            onMouseEnter={() => setHoveredKpi('mos')}
                            onMouseLeave={() => setHoveredKpi(null)}
                        >
                            <div className="kpi-label">
                                Ocena Sieci (MOS) <Info size={12} className="info-icon" />
                            </div>
                            <div className="kpi-value" style={{ color: mosClass(mosScore) }}>
                                {mosScore.toFixed(2)}
                                <span className="kpi-unit">/ 5.0</span>
                            </div>

                        </div>

                        {/* RTT */}
                        <div
                            className="analytics-kpi-card"
                            onMouseEnter={() => setHoveredKpi('rtt')}
                            onMouseLeave={() => setHoveredKpi(null)}
                        >
                            <div className="kpi-label">
                                Średni RTT (Ping) <Info size={12} className="info-icon" />
                            </div>
                            <div className="kpi-value">
                                {avgRtt.toFixed(1)}
                                <span className="kpi-unit">ms</span>
                            </div>

                        </div>

                        {/* Packet Loss % */}
                        <div
                            className="analytics-kpi-card"
                            onMouseEnter={() => setHoveredKpi('loss')}
                            onMouseLeave={() => setHoveredKpi(null)}
                        >
                            <div className="kpi-label">
                                Utrata pakietów <Info size={12} className="info-icon" />
                            </div>
                            <div className="kpi-value">
                                {avgLoss.toFixed(2)}
                                <span className="kpi-unit">%</span>
                            </div>

                        </div>

                        {/* Jitter */}
                        <div
                            className="analytics-kpi-card"
                            onMouseEnter={() => setHoveredKpi('jitter')}
                            onMouseLeave={() => setHoveredKpi(null)}
                        >
                            <div className="kpi-label">
                                Średni Jitter <Info size={12} className="info-icon" />
                            </div>
                            <div className="kpi-value">
                                {avgJitter.toFixed(1)}
                                <span className="kpi-unit">ms</span>
                            </div>

                        </div>

                        {/* Total Lost */}
                        <div
                            className="analytics-kpi-card"
                            onMouseEnter={() => setHoveredKpi('lost')}
                            onMouseLeave={() => setHoveredKpi(null)}
                        >
                            <div className="kpi-label">
                                Pakiety utracone <Info size={12} className="info-icon" />
                            </div>
                            <div className="kpi-value">
                                {totalLost.toLocaleString()}
                            </div>

                        </div>
                    </div>

                    {/* Floating Tooltip */}
                    {hoveredKpi && kpiDescriptions[hoveredKpi] && (
                        <div
                            className="kpi-tooltip-overlay"
                            style={{
                                position: 'fixed',
                                zIndex: 9999,
                                top: tooltipPos.y,
                                left: tooltipPos.x,
                                pointerEvents: 'none'
                            }}
                        >
                            {kpiDescriptions[hoveredKpi]}
                        </div>
                    )}

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
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit=" ms" width={80} type="number" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="linear"
                                        dataKey="rtt"
                                        name="RTT"
                                        stroke="#5b8def"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#5b8def', stroke: '#1e1f22', strokeWidth: 2 }}
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
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit=" ms" width={80} type="number" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="linear"
                                        dataKey="jitter"
                                        name="Jitter"
                                        stroke="#f0a030"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#f0a030', stroke: '#1e1f22', strokeWidth: 2 }}
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
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="stepAfter"
                                        dataKey="packetLossRatio"
                                        name="Packet Loss"
                                        stroke="#ed4245"
                                        strokeWidth={2}
                                        fill="url(#lossGradient)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#ed4245', stroke: '#1e1f22', strokeWidth: 2 }}
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
