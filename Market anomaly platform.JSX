import { useState, useEffect, useRef, useCallback } from "react";

// ─── SYNTHETIC DATA ENGINE ───────────────────────────────────────────────────
const TICKERS = ["AAPL", "NVDA", "TSLA", "GME", "AMC", "MSFT", "META", "GOOGL", "SPY", "QQQ"];
const ANOMALY_TYPES = ["Wash Trading", "Spoofing", "Layering", "Pump & Dump", "Front Running", "Quote Stuffing", "Marking the Close", "Painting the Tape"];
const SEVERITY = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES = ["NEW", "INVESTIGATING", "ESCALATED", "RESOLVED", "FALSE_POSITIVE"];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateAlerts(n = 40) {
  const rng = seededRandom(42);
  return Array.from({ length: n }, (_, i) => {
    const sev = SEVERITY[Math.floor(rng() * SEVERITY.length)];
    const anomalyScore = sev === "CRITICAL" ? 85 + rng() * 15 :
                         sev === "HIGH" ? 65 + rng() * 20 :
                         sev === "MEDIUM" ? 40 + rng() * 25 :
                         10 + rng() * 30;
    const ts = Date.now() - Math.floor(rng() * 86400000 * 3);
    return {
      id: `ALT-${String(i + 1001).padStart(5, "0")}`,
      ticker: TICKERS[Math.floor(rng() * TICKERS.length)],
      type: ANOMALY_TYPES[Math.floor(rng() * ANOMALY_TYPES.length)],
      severity: sev,
      score: Math.round(anomalyScore * 10) / 10,
      status: STATUSES[Math.floor(rng() * STATUSES.length)],
      timestamp: ts,
      volume: Math.floor(rng() * 10000000) + 100000,
      priceImpact: ((rng() - 0.3) * 15).toFixed(2),
      confidence: Math.round((60 + rng() * 40) * 10) / 10,
      assignee: rng() > 0.5 ? ["A. Torres", "M. Chen", "K. Oduya", "L. Petrov"][Math.floor(rng() * 4)] : null,
      falsePositiveScore: Math.round(rng() * 40 * 10) / 10,
      relatedAlerts: Math.floor(rng() * 5),
      exchanges: ["NYSE", "NASDAQ", "CBOE", "BATS"][Math.floor(rng() * 4)],
      mlModel: ["IsolationForest", "Autoencoder", "LSTMAD", "ZScore+IQR"][Math.floor(rng() * 4)],
    };
  });
}

function generatePriceData(ticker, points = 120) {
  const rng = seededRandom(ticker.charCodeAt(0) * 37);
  let price = 100 + rng() * 300;
  return Array.from({ length: points }, (_, i) => {
    const isAnomaly = i === 45 || i === 78 || i === 95;
    const spike = isAnomaly ? (rng() > 0.5 ? 1 : -1) * (5 + rng() * 12) : 0;
    price = price * (1 + (rng() - 0.49) * 0.02) + spike;
    return {
      t: i,
      price: Math.max(5, price),
      volume: Math.floor(rng() * 500000) + 50000,
      isAnomaly,
    };
  });
}

function generateHeatmapData() {
  const rng = seededRandom(99);
  return TICKERS.map(ticker => ({
    ticker,
    scores: Array.from({ length: 24 }, () => Math.round(rng() * 100)),
  }));
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ data, width = 80, height = 28, color = "#00ffc8", anomalies = [] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
      {anomalies.map((idx, k) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((data[idx] - min) / range) * height;
        return <circle key={k} cx={x} cy={y} r={3} fill="#ff4444" />;
      })}
    </svg>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 44 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#ff2244" : score >= 60 ? "#ff8c00" : score >= 40 ? "#ffd700" : "#00ffc8";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        style={{ fill: color, fontSize: "11px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ─── MINI CHART ──────────────────────────────────────────────────────────────
function MiniChart({ data, width = 320, height = 90 }) {
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const toX = i => (i / (data.length - 1)) * width;
  const toY = v => height - 10 - ((v - min) / range) * (height - 20);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.price)}`).join(" ");
  const fill = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ffc8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00ffc8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#chartFill)" />
      <path d={path} fill="none" stroke="#00ffc8" strokeWidth="1.5" />
      {data.filter(d => d.isAnomaly).map((d, k) => {
        const x = toX(data.indexOf(d));
        return (
          <g key={k}>
            <line x1={x} y1={0} x2={x} y2={height} stroke="#ff2244" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
            <circle cx={x} cy={toY(d.price)} r={4} fill="#ff2244" style={{ filter: "drop-shadow(0 0 4px #ff2244)" }} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    NEW: { bg: "#1a1a3e", text: "#7b7bff", border: "#3333aa" },
    INVESTIGATING: { bg: "#1e2800", text: "#aaff00", border: "#446600" },
    ESCALATED: { bg: "#2e1400", text: "#ff8c00", border: "#884400" },
    RESOLVED: { bg: "#001a12", text: "#00ffc8", border: "#00664d" },
    FALSE_POSITIVE: { bg: "#1a1a1a", text: "#888", border: "#444" },
  };
  const c = colors[status] || colors.NEW;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "2px 8px", borderRadius: "3px", fontSize: "9px", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", fontWeight: 700 }}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── SEVERITY BADGE ──────────────────────────────────────────────────────────
function SevBadge({ sev }) {
  const colors = { CRITICAL: "#ff2244", HIGH: "#ff8c00", MEDIUM: "#ffd700", LOW: "#00ffc8" };
  const c = colors[sev] || "#888";
  return (
    <span style={{ color: c, fontSize: "9px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.1em", textShadow: `0 0 8px ${c}` }}>
      ▲ {sev}
    </span>
  );
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────
function Heatmap({ data }) {
  const scoreColor = s => {
    if (s > 75) return `rgba(255,34,68,${0.4 + s / 200})`;
    if (s > 50) return `rgba(255,140,0,${0.3 + s / 250})`;
    if (s > 25) return `rgba(255,215,0,${0.2 + s / 400})`;
    return `rgba(0,255,200,${0.1 + s / 400})`;
  };
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `60px repeat(24, 1fr)`, gap: "2px", minWidth: "580px" }}>
        <div style={{ fontSize: "9px", color: "#555", paddingTop: "2px" }}></div>
        {hours.map(h => (
          <div key={h} style={{ fontSize: "8px", color: "#555", textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>{h}h</div>
        ))}
        {data.map(row => (
          <>
            <div key={`t-${row.ticker}`} style={{ fontSize: "10px", color: "#aaa", fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center" }}>{row.ticker}</div>
            {row.scores.map((s, hi) => (
              <div key={`${row.ticker}-${hi}`} title={`${row.ticker} ${hi}:00 — Score: ${s}`}
                style={{ height: "14px", background: scoreColor(s), borderRadius: "1px", cursor: "pointer", transition: "transform 0.1s" }}
                onMouseEnter={e => { e.target.style.transform = "scale(1.3)"; e.target.style.zIndex = "10"; }}
                onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.zIndex = "1"; }} />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}

// ─── PATTERN RADAR ───────────────────────────────────────────────────────────
function PatternRadar({ alert }) {
  const axes = ["Volume Spike", "Price Deviation", "Order Velocity", "Spread Anomaly", "Time Pattern", "Correlation"];
  const rng = seededRandom(alert.id.charCodeAt(4) * 17);
  const values = axes.map(() => rng() * 100);
  const cx = 80, cy = 80, r = 60;
  const angleStep = (2 * Math.PI) / axes.length;
  const toXY = (val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (val / 100) * r;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const gridPath = (pct) => {
    return axes.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const rad = pct * r;
      return `${i === 0 ? "M" : "L"}${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
    }).join(" ") + "Z";
  };
  const dataPath = values.map((v, i) => { const [x, y] = toXY(v, i); return `${i === 0 ? "M" : "L"}${x},${y}`; }).join(" ") + "Z";
  return (
    <svg width={160} height={160}>
      {[0.25, 0.5, 0.75, 1].map(p => (
        <path key={p} d={gridPath(p)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = toXY(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(0,255,200,0.12)" stroke="#00ffc8" strokeWidth="1.5" />
      {values.map((v, i) => {
        const [x, y] = toXY(v, i);
        return <circle key={i} cx={x} cy={y} r={3} fill="#00ffc8" style={{ filter: "drop-shadow(0 0 3px #00ffc8)" }} />;
      })}
      {axes.map((label, i) => {
        const [x, y] = toXY(115, i);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: "7px", fill: "#666", fontFamily: "JetBrains Mono, monospace" }}>{label.split(" ")[0]}</text>;
      })}
    </svg>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [alerts] = useState(() => generateAlerts(40));
  const [heatmap] = useState(() => generateHeatmapData());
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("alerts");
  const [filterSev, setFilterSev] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [sortBy, setSortBy] = useState("score");
  const [searchQ, setSearchQ] = useState("");
  const [chartTicker, setChartTicker] = useState("AAPL");
  const [priceData] = useState(() => Object.fromEntries(TICKERS.map(t => [t, generatePriceData(t)])));
  const [pulseCount, setPulseCount] = useState(0);
  const [fpModal, setFpModal] = useState(false);
  const [fpReason, setFpReason] = useState("");
  const [alertStatuses, setAlertStatuses] = useState({});
  const [scanProgress, setScanProgress] = useState(0);
  const [liveScores, setLiveScores] = useState({});

  // Animate scan progress
  useEffect(() => {
    const t = setInterval(() => setScanProgress(p => (p + 0.7) % 100), 80);
    return () => clearInterval(t);
  }, []);

  // Animate live scores
  useEffect(() => {
    const rng = seededRandom(Date.now());
    const t = setInterval(() => {
      setPulseCount(c => c + 1);
      setLiveScores(prev => {
        const next = { ...prev };
        TICKERS.forEach(tk => { next[tk] = Math.round((50 + rng() * 50) * 10) / 10; });
        return next;
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const filteredAlerts = alerts
    .filter(a => filterSev === "ALL" || a.severity === filterSev)
    .filter(a => filterStatus === "ALL" || (alertStatuses[a.id] || a.status) === filterStatus)
    .filter(a => filterType === "ALL" || a.type === filterType)
    .filter(a => !searchQ || a.ticker.includes(searchQ.toUpperCase()) || a.type.toLowerCase().includes(searchQ.toLowerCase()) || a.id.includes(searchQ))
    .sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "time" ? b.timestamp - a.timestamp : 0);

  const stats = {
    critical: alerts.filter(a => a.severity === "CRITICAL").length,
    high: alerts.filter(a => a.severity === "HIGH").length,
    investigating: alerts.filter(a => (alertStatuses[a.id] || a.status) === "INVESTIGATING").length,
    avgScore: Math.round(alerts.reduce((s, a) => s + a.score, 0) / alerts.length),
    fpRate: Math.round(alerts.filter(a => (alertStatuses[a.id] || a.status) === "FALSE_POSITIVE").length / alerts.length * 100),
  };

  const changeStatus = (id, status) => setAlertStatuses(prev => ({ ...prev, [id]: status }));

  const selectedAlert = selected ? alerts.find(a => a.id === selected) : null;

  const bg = "#080c14";
  const panel = "rgba(12,18,30,0.95)";
  const border = "rgba(0,255,200,0.08)";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: "#e0e8f0", fontFamily: "'JetBrains Mono', 'Courier New', monospace", position: "relative", overflow: "hidden" }}>
      {/* Scan line effect */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,200,0.008) 2px, rgba(0,255,200,0.008) 4px)" }} />

      {/* Animated scan bar */}
      <div style={{ position: "fixed", top: `${scanProgress}%`, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,255,200,0.15), transparent)", pointerEvents: "none", zIndex: 1 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ── HEADER ── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${border}`, background: "rgba(8,12,20,0.98)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "36px", height: "36px", border: "2px solid #00ffc8", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M2,10 L6,4 L10,12 L14,6 L18,10" fill="none" stroke="#00ffc8" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="6" cy="4" r="2" fill="#ff2244" />
                  <circle cx="14" cy="6" r="2" fill="#ff8c00" />
                </svg>
              </div>
              <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", background: "#ff2244", borderRadius: "50%", animation: "pulse 1s infinite" }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#00ffc8", letterSpacing: "0.12em" }}>SENTINEL</div>
              <div style={{ fontSize: "9px", color: "#445566", letterSpacing: "0.2em" }}>MARKET ANOMALY DETECTION SYSTEM v2.4</div>
            </div>
          </div>

          {/* Live ticker strip */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {TICKERS.slice(0, 5).map(tk => {
              const s = liveScores[tk] || 50;
              const c = s > 70 ? "#ff2244" : s > 50 ? "#ff8c00" : "#00ffc8";
              return (
                <div key={tk} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "9px", color: "#556" }}>{tk}</div>
                  <div style={{ fontSize: "11px", color: c, fontWeight: 700 }}>{s}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "9px", color: "#445566" }}>
              SCAN #{pulseCount + 1847} · {new Date().toLocaleTimeString()}
            </div>
            <div style={{ width: "8px", height: "8px", background: "#00ffc8", borderRadius: "50%", animation: "pulse 1.5s infinite", boxShadow: "0 0 8px #00ffc8" }} />
            <span style={{ fontSize: "9px", color: "#00ffc8" }}>LIVE</span>
          </div>
        </header>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", padding: "16px 24px 0" }}>
          {[
            { label: "CRITICAL ALERTS", val: stats.critical, color: "#ff2244", sub: "Requires immediate action" },
            { label: "HIGH SEVERITY", val: stats.high, color: "#ff8c00", sub: "Elevated risk indicators" },
            { label: "UNDER INVESTIGATION", val: stats.investigating, color: "#7b7bff", sub: "Active case review" },
            { label: "AVG ANOMALY SCORE", val: stats.avgScore, color: "#ffd700", sub: "Portfolio-wide baseline" },
            { label: "FALSE POSITIVE RATE", val: `${stats.fpRate}%`, color: "#00ffc8", sub: "30-day rolling average" },
          ].map(({ label, val, color, sub }) => (
            <div key={label} style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color, opacity: 0.6 }} />
              <div style={{ fontSize: "9px", color: "#556677", letterSpacing: "0.12em", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "26px", fontWeight: 700, color, lineHeight: 1, marginBottom: "4px" }}>{val}</div>
              <div style={{ fontSize: "9px", color: "#445566" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── TAB NAV ── */}
        <div style={{ display: "flex", gap: "2px", padding: "16px 24px 0", borderBottom: `1px solid ${border}` }}>
          {[["alerts", "⚡ Alert Queue"], ["investigate", "🔍 Investigation"], ["patterns", "📊 Pattern Map"], ["heatmap", "🌡 Activity Heatmap"], ["models", "🤖 ML Models"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ background: tab === key ? "rgba(0,255,200,0.08)" : "transparent", color: tab === key ? "#00ffc8" : "#445566", border: `1px solid ${tab === key ? "rgba(0,255,200,0.2)" : "transparent"}`, padding: "8px 16px", fontSize: "10px", cursor: "pointer", borderRadius: "6px 6px 0 0", letterSpacing: "0.08em", fontFamily: "inherit", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: selectedAlert ? "1fr 380px" : "1fr", gap: "20px", alignItems: "start" }}>

          {/* ── LEFT PANEL ── */}
          <div>
            {tab === "alerts" && (
              <>
                {/* Filters */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search ticker, type, ID..."
                    style={{ background: panel, border: `1px solid ${border}`, color: "#e0e8f0", padding: "7px 12px", borderRadius: "6px", fontSize: "11px", fontFamily: "inherit", width: "200px", outline: "none" }} />
                  {[["filterSev", filterSev, setFilterSev, ["ALL", ...SEVERITY]],
                    ["filterStatus", filterStatus, setFilterStatus, ["ALL", ...STATUSES]],
                    ["filterType", filterType, setFilterType, ["ALL", ...ANOMALY_TYPES.slice(0, 5)]]].map(([key, val, setter, opts]) => (
                    <select key={key} value={val} onChange={e => setter(e.target.value)}
                      style={{ background: panel, border: `1px solid ${border}`, color: "#e0e8f0", padding: "7px 10px", borderRadius: "6px", fontSize: "10px", fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ background: panel, border: `1px solid ${border}`, color: "#e0e8f0", padding: "7px 10px", borderRadius: "6px", fontSize: "10px", fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                    <option value="score">Sort: Score</option>
                    <option value="time">Sort: Time</option>
                  </select>
                  <div style={{ marginLeft: "auto", fontSize: "10px", color: "#445566", display: "flex", alignItems: "center" }}>
                    {filteredAlerts.length} alerts
                  </div>
                </div>

                {/* Alert table */}
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "90px 60px 160px 80px 60px 90px 100px 80px 80px", gap: 0, borderBottom: `1px solid ${border}`, padding: "8px 12px", fontSize: "8px", color: "#445566", letterSpacing: "0.15em" }}>
                    <div>ALERT ID</div><div>TICKER</div><div>TYPE</div><div>SEVERITY</div><div>SCORE</div><div>STATUS</div><div>TIME</div><div>CONFIDENCE</div><div>ACTIONS</div>
                  </div>
                  <div style={{ maxHeight: "480px", overflowY: "auto" }}>
                    {filteredAlerts.map((alert, idx) => {
                      const status = alertStatuses[alert.id] || alert.status;
                      const isSelected = selected === alert.id;
                      return (
                        <div key={alert.id} onClick={() => setSelected(isSelected ? null : alert.id)}
                          style={{ display: "grid", gridTemplateColumns: "90px 60px 160px 80px 60px 90px 100px 80px 80px", gap: 0, padding: "10px 12px", borderBottom: `1px solid rgba(0,255,200,0.04)`, cursor: "pointer", background: isSelected ? "rgba(0,255,200,0.05)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", transition: "background 0.1s", alignItems: "center" }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "rgba(0,255,200,0.03)")}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>
                          <div style={{ fontSize: "10px", color: "#7b7bff" }}>{alert.id}</div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#e0e8f0" }}>{alert.ticker}</div>
                          <div style={{ fontSize: "9px", color: "#889" }}>{alert.type}</div>
                          <div><SevBadge sev={alert.severity} /></div>
                          <div><ScoreRing score={alert.score} size={36} /></div>
                          <div><StatusBadge status={status} /></div>
                          <div style={{ fontSize: "9px", color: "#556" }}>{new Date(alert.timestamp).toLocaleDateString()}</div>
                          <div>
                            <div style={{ background: "rgba(0,255,200,0.1)", borderRadius: "3px", height: "6px", width: "60px" }}>
                              <div style={{ height: "100%", width: `${alert.confidence}%`, background: "#00ffc8", borderRadius: "3px" }} />
                            </div>
                            <div style={{ fontSize: "8px", color: "#556", marginTop: "2px" }}>{alert.confidence}%</div>
                          </div>
                          <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => changeStatus(alert.id, "INVESTIGATING")}
                              style={{ fontSize: "8px", background: "rgba(123,123,255,0.15)", border: "1px solid rgba(123,123,255,0.3)", color: "#7b7bff", padding: "2px 5px", borderRadius: "3px", cursor: "pointer", fontFamily: "inherit" }}>INV</button>
                            <button onClick={() => { setSelected(alert.id); setFpModal(true); }}
                              style={{ fontSize: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#666", padding: "2px 5px", borderRadius: "3px", cursor: "pointer", fontFamily: "inherit" }}>FP</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {tab === "investigate" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Price chart */}
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "16px", gridColumn: "1/-1" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#00ffc8", letterSpacing: "0.1em" }}>PRICE + ANOMALY OVERLAY</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {TICKERS.slice(0, 6).map(t => (
                        <button key={t} onClick={() => setChartTicker(t)}
                          style={{ fontSize: "9px", background: chartTicker === t ? "rgba(0,255,200,0.15)" : "transparent", border: `1px solid ${chartTicker === t ? "rgba(0,255,200,0.3)" : "rgba(255,255,255,0.1)"}`, color: chartTicker === t ? "#00ffc8" : "#556", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <MiniChart data={priceData[chartTicker]} width={680} height={120} />
                  <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                    <span style={{ fontSize: "9px", color: "#00ffc8" }}>── Price</span>
                    <span style={{ fontSize: "9px", color: "#ff2244" }}>● Anomaly Event</span>
                    <span style={{ fontSize: "9px", color: "#ff2244" }}>-- Detection Threshold</span>
                  </div>
                </div>

                {/* Top alerts detail */}
                {alerts.filter(a => a.severity === "CRITICAL").slice(0, 4).map(alert => (
                  <div key={alert.id} style={{ background: panel, border: `1px solid rgba(255,34,68,0.15)`, borderRadius: "8px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#ff2244" }}>{alert.ticker}</div>
                        <div style={{ fontSize: "9px", color: "#556" }}>{alert.type}</div>
                      </div>
                      <ScoreRing score={alert.score} size={44} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "9px" }}>
                      <div style={{ color: "#556" }}>Volume: <span style={{ color: "#e0e8f0" }}>{(alert.volume / 1000000).toFixed(2)}M</span></div>
                      <div style={{ color: "#556" }}>Price Δ: <span style={{ color: parseFloat(alert.priceImpact) > 0 ? "#00ffc8" : "#ff2244" }}>{alert.priceImpact}%</span></div>
                      <div style={{ color: "#556" }}>Model: <span style={{ color: "#7b7bff" }}>{alert.mlModel}</span></div>
                      <div style={{ color: "#556" }}>Exchange: <span style={{ color: "#e0e8f0" }}>{alert.exchanges}</span></div>
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                      {["INVESTIGATING", "ESCALATED", "RESOLVED"].map(s => (
                        <button key={s} onClick={() => changeStatus(alert.id, s)}
                          style={{ fontSize: "8px", padding: "3px 8px", background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`, color: "#889", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}>
                          {s.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "patterns" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "16px", gridColumn: "1/-1" }}>
                  <div style={{ fontSize: "11px", color: "#00ffc8", marginBottom: "12px", letterSpacing: "0.1em" }}>ANOMALY TYPE DISTRIBUTION</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {ANOMALY_TYPES.map(type => {
                      const count = alerts.filter(a => a.type === type).length;
                      const pct = Math.round(count / alerts.length * 100);
                      const rng2 = seededRandom(type.length * 7);
                      const c = ["#ff2244", "#ff8c00", "#ffd700", "#00ffc8", "#7b7bff"][Math.floor(rng2() * 5)];
                      return (
                        <div key={type} style={{ background: `${c}18`, border: `1px solid ${c}44`, borderRadius: "6px", padding: "8px 12px", cursor: "pointer" }}
                          onClick={() => setFilterType(type)}>
                          <div style={{ fontSize: "10px", color: c, fontWeight: 700 }}>{type}</div>
                          <div style={{ fontSize: "18px", color: "#e0e8f0", fontWeight: 700 }}>{count}</div>
                          <div style={{ fontSize: "8px", color: "#556" }}>{pct}% of alerts</div>
                          <div style={{ marginTop: "6px", height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                            <div style={{ height: "100%", width: `${pct * 3}%`, background: c, borderRadius: "2px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {alerts.slice(0, 6).map(alert => (
                  <div key={alert.id} style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", color: "#7b7bff", marginBottom: "2px" }}>{alert.id}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#e0e8f0", marginBottom: "6px" }}>{alert.ticker}</div>
                    <PatternRadar alert={alert} />
                    <div style={{ fontSize: "9px", color: "#445566", textAlign: "center" }}>{alert.type}</div>
                    <SevBadge sev={alert.severity} />
                  </div>
                ))}
              </div>
            )}

            {tab === "heatmap" && (
              <div>
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#00ffc8", letterSpacing: "0.1em" }}>INTRADAY ANOMALY HEATMAP · LAST 24H</div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "9px", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(0,255,200,0.3)", borderRadius: "2px" }} /><span style={{ color: "#556" }}>Low</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(255,215,0,0.5)", borderRadius: "2px" }} /><span style={{ color: "#556" }}>Medium</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(255,34,68,0.7)", borderRadius: "2px" }} /><span style={{ color: "#556" }}>Critical</span></div>
                    </div>
                  </div>
                  <Heatmap data={heatmap} />
                </div>

                {/* Sparkline grid */}
                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: "8px", padding: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#00ffc8", letterSpacing: "0.1em", marginBottom: "12px" }}>TICKER ANOMALY SCORES — TREND</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
                    {TICKERS.map(tk => {
                      const d = priceData[tk];
                      const sparkPrices = d.map(p => p.price);
                      const anomalyIdxs = d.map((p, i) => p.isAnomaly ? i : -1).filter(i => i >= 0);
                      const score = liveScores[tk] || 50;
                      const c = score > 70 ? "#ff2244" : score > 50 ? "#ff8c00" : "#00ffc8";
                      return (
                        <div key={tk} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.05)`, borderRadius: "6px", padding: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#e0e8f0" }}>{tk}</span>
                            <span style={{ fontSize: "11px", color: c, fontWeight: 700 }}>{score}</span>
                          </div>
                          <Sparkline data={sparkPrices} anomalies={anomalyIdxs} width={100} height={32} color={c} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === "models" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {[
                  { name: "Isolation Forest", acc: 94.2, fp: 8.1, speed: "12ms", desc: "Unsupervised tree-based anomaly scoring on volume/price features", status: "ACTIVE", alerts: 14 },
                  { name: "LSTM Autoencoder", acc: 91.8, fp: 6.4, speed: "28ms", desc: "Sequential pattern detection for time-series reconstruction error", status: "ACTIVE", alerts: 9 },
                  { name: "Z-Score + IQR", acc: 87.3, fp: 14.2, speed: "2ms", desc: "Statistical baseline deviation detection for rapid screening", status: "ACTIVE", alerts: 22 },
                  { name: "Graph Neural Net", acc: 96.1, fp: 4.8, speed: "95ms", desc: "Entity-relationship detection for coordinated trading rings", status: "TRAINING", alerts: 6 },
                  { name: "Ensemble Scorer", acc: 97.4, fp: 3.2, speed: "140ms", desc: "Weighted combination of all models with calibrated confidence", status: "ACTIVE", alerts: 31 },
                  { name: "XGBoost Classifier", acc: 89.5, fp: 11.7, speed: "8ms", desc: "Gradient boosted decision trees on engineered trading features", status: "DEGRADED", alerts: 17 },
                ].map(m => (
                  <div key={m.name} style={{ background: panel, border: `1px solid ${m.status === "ACTIVE" ? border : m.status === "TRAINING" ? "rgba(123,123,255,0.15)" : "rgba(255,140,0,0.15)"}`, borderRadius: "8px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#e0e8f0", marginBottom: "3px" }}>{m.name}</div>
                        <div style={{ fontSize: "9px", color: "#445566", maxWidth: "220px" }}>{m.desc}</div>
                      </div>
                      <span style={{ fontSize: "8px", padding: "3px 8px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.1em",
                        background: m.status === "ACTIVE" ? "rgba(0,255,200,0.1)" : m.status === "TRAINING" ? "rgba(123,123,255,0.1)" : "rgba(255,140,0,0.1)",
                        color: m.status === "ACTIVE" ? "#00ffc8" : m.status === "TRAINING" ? "#7b7bff" : "#ff8c00",
                        border: `1px solid ${m.status === "ACTIVE" ? "rgba(0,255,200,0.2)" : m.status === "TRAINING" ? "rgba(123,123,255,0.2)" : "rgba(255,140,0,0.2)"}` }}>
                        {m.status}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", fontSize: "9px" }}>
                      {[["ACCURACY", `${m.acc}%`, "#00ffc8"], ["FALSE POS", `${m.fp}%`, "#ff8c00"], ["LATENCY", m.speed, "#7b7bff"], ["ALERTS", m.alerts, "#ffd700"]].map(([l, v, c]) => (
                        <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "4px", padding: "8px 6px", textAlign: "center" }}>
                          <div style={{ color: "#445566", marginBottom: "4px", letterSpacing: "0.08em" }}>{l}</div>
                          <div style={{ color: c, fontWeight: 700, fontSize: "13px" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {m.status !== "TRAINING" && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ fontSize: "8px", color: "#556", marginBottom: "4px" }}>DETECTION CONFIDENCE</div>
                        <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${m.acc}%`, background: "linear-gradient(90deg, #00ffc8, #7b7bff)", borderRadius: "2px" }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── INVESTIGATION SIDEBAR ── */}
          {selectedAlert && (
            <div style={{ background: panel, border: `1px solid rgba(0,255,200,0.15)`, borderRadius: "10px", overflow: "hidden", position: "sticky", top: "80px" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "9px", color: "#445566" }}>INVESTIGATION PANEL</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#00ffc8" }}>{selectedAlert.id}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#556", cursor: "pointer", fontSize: "18px" }}>×</button>
              </div>

              <div style={{ padding: "14px 16px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#e0e8f0" }}>{selectedAlert.ticker}</div>
                    <div style={{ fontSize: "10px", color: "#556" }}>{selectedAlert.exchanges}</div>
                  </div>
                  <ScoreRing score={selectedAlert.score} size={52} />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <SevBadge sev={selectedAlert.severity} />
                  <span style={{ marginLeft: "8px" }}><StatusBadge status={alertStatuses[selectedAlert.id] || selectedAlert.status} /></span>
                </div>

                <div style={{ fontSize: "11px", color: "#aab", background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
                  {selectedAlert.type}
                </div>

                {/* Pattern radar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
                  <PatternRadar alert={selectedAlert} />
                </div>

                {/* Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  {[
                    ["Anomaly Score", selectedAlert.score, "#ff2244"],
                    ["Confidence", `${selectedAlert.confidence}%`, "#00ffc8"],
                    ["Volume", `${(selectedAlert.volume / 1e6).toFixed(1)}M`, "#e0e8f0"],
                    ["Price Impact", `${selectedAlert.priceImpact}%`, parseFloat(selectedAlert.priceImpact) > 0 ? "#00ffc8" : "#ff2244"],
                    ["FP Score", `${selectedAlert.falsePositiveScore}%`, "#ffd700"],
                    ["Related", selectedAlert.relatedAlerts, "#7b7bff"],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "5px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "8px", color: "#445566", marginBottom: "2px" }}>{l}</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "14px", padding: "10px", background: "rgba(123,123,255,0.08)", borderRadius: "6px", border: "1px solid rgba(123,123,255,0.15)" }}>
                  <div style={{ fontSize: "8px", color: "#7b7bff", marginBottom: "4px", letterSpacing: "0.1em" }}>ML MODEL</div>
                  <div style={{ fontSize: "11px", color: "#e0e8f0" }}>{selectedAlert.mlModel}</div>
                  {selectedAlert.assignee && <div style={{ fontSize: "9px", color: "#556", marginTop: "4px" }}>Assigned: {selectedAlert.assignee}</div>}
                </div>

                {/* Workflow actions */}
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: "12px" }}>
                  <div style={{ fontSize: "8px", color: "#445566", marginBottom: "8px", letterSpacing: "0.12em" }}>WORKFLOW ACTIONS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { label: "Investigate", status: "INVESTIGATING", color: "#7b7bff" },
                      { label: "Escalate", status: "ESCALATED", color: "#ff8c00" },
                      { label: "Resolve", status: "RESOLVED", color: "#00ffc8" },
                      { label: "False Positive", status: "FALSE_POSITIVE", color: "#556" },
                    ].map(({ label, status, color }) => (
                      <button key={status} onClick={() => changeStatus(selectedAlert.id, status)}
                        style={{ padding: "8px", background: `${color}18`, border: `1px solid ${color}44`, color, borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: "inherit", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.target.style.background = `${color}30`; }}
                        onMouseLeave={e => { e.target.style.background = `${color}18`; }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginTop: "14px", borderTop: `1px solid ${border}`, paddingTop: "12px" }}>
                  <div style={{ fontSize: "8px", color: "#445566", marginBottom: "8px", letterSpacing: "0.12em" }}>EVENT TIMELINE</div>
                  {[
                    { t: "Detected", time: new Date(selectedAlert.timestamp).toLocaleTimeString(), color: "#ff2244" },
                    { t: "ML Scored", time: new Date(selectedAlert.timestamp + 12000).toLocaleTimeString(), color: "#7b7bff" },
                    { t: "Queued", time: new Date(selectedAlert.timestamp + 45000).toLocaleTimeString(), color: "#00ffc8" },
                    { t: (alertStatuses[selectedAlert.id] || selectedAlert.status) !== "NEW" ? "Status Updated" : "Awaiting Review", time: "—", color: "#556" },
                  ].map(({ t, time, color }) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
                      <div style={{ fontSize: "9px", color: "#aab", flex: 1 }}>{t}</div>
                      <div style={{ fontSize: "9px", color: "#556" }}>{time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FALSE POSITIVE MODAL ── */}
      {fpModal && selectedAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#0d1520", border: "1px solid rgba(0,255,200,0.2)", borderRadius: "12px", padding: "24px", width: "400px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#00ffc8", marginBottom: "6px", letterSpacing: "0.1em" }}>MARK AS FALSE POSITIVE</div>
            <div style={{ fontSize: "10px", color: "#556", marginBottom: "16px" }}>{selectedAlert.id} · {selectedAlert.ticker} · {selectedAlert.type}</div>
            <div style={{ fontSize: "9px", color: "#445566", marginBottom: "6px" }}>REASON</div>
            <div style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
              {["Expected corporate action", "Known liquidity event", "Market maker activity", "Algorithm calibration", "Other"].map(r => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "10px", color: fpReason === r ? "#00ffc8" : "#889" }}>
                  <input type="radio" name="fpr" value={r} checked={fpReason === r} onChange={() => setFpReason(r)} style={{ accentColor: "#00ffc8" }} />
                  {r}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { if (fpReason) { changeStatus(selectedAlert.id, "FALSE_POSITIVE"); setFpModal(false); setFpReason(""); } }}
                style={{ flex: 1, padding: "10px", background: fpReason ? "rgba(0,255,200,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${fpReason ? "rgba(0,255,200,0.3)" : "rgba(255,255,255,0.1)"}`, color: fpReason ? "#00ffc8" : "#556", borderRadius: "6px", cursor: fpReason ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "10px" }}>
                Confirm FP
              </button>
              <button onClick={() => { setFpModal(false); setFpReason(""); }}
                style={{ padding: "10px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#556", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "10px" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,200,0.2); border-radius: 2px; }
        select option { background: #0d1520; color: #e0e8f0; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}