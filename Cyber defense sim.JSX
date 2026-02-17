import { useState, useEffect, useRef, useCallback } from "react";

// ─── Color palette & theme constants ───────────────────────────────────────
const THEME = {
  bg:       "#030b14",
  panel:    "#060f1e",
  border:   "#0d2640",
  accent:   "#00d4ff",
  warn:     "#ff6b35",
  danger:   "#ff1a4b",
  success:  "#00ff9d",
  mid:      "#ffd700",
  text:     "#c8ddf0",
  muted:    "#3a5f7a",
};

// ─── Attack scenario definitions ───────────────────────────────────────────
const SCENARIOS = {
  ddos: {
    id: "ddos",
    name: "DDoS Cascade",
    icon: "⚡",
    color: THEME.warn,
    description: "Volumetric flood targeting payment gateway & core banking APIs",
    phases: ["Reconnaissance","Amplification","Peak Flood","Persistence"],
    defenses: ["Rate Limiting","CDN Scrubbing","BGP Blackholing","Traffic Shaping"],
    metrics: { bandwidth: 0, requests: 0, availability: 100 },
    riskWeight: 0.25,
  },
  ransomware: {
    id: "ransomware",
    name: "Ransomware Strike",
    icon: "🔒",
    color: "#b44fff",
    description: "Encrypted lateral movement through SWIFT messaging & back-office systems",
    phases: ["Phishing Entry","Privilege Escalation","Lateral Movement","Encryption"],
    defenses: ["EDR Isolation","Backup Validation","Network Segmentation","IR Playbook"],
    metrics: { systems: 0, encrypted: 0, containment: 0 },
    riskWeight: 0.40,
  },
  breach: {
    id: "breach",
    name: "Data Exfiltration",
    icon: "🕵",
    color: THEME.success,
    description: "Silent APT harvesting PII, transaction records & trading algorithms",
    phases: ["Initial Access","Discovery","Collection","Exfiltration"],
    defenses: ["DLP Enforcement","UEBA Alerts","Honeytokens","SOC Triage"],
    metrics: { records: 0, dwell: 0, detected: false },
    riskWeight: 0.35,
  },
};

// ─── Defense categories ─────────────────────────────────────────────────────
const DEFENSE_BUDGET = 100;
const DEFENSE_CATEGORIES = [
  { id: "perimeter",  label: "Perimeter Defense",    icon: "🛡", color: THEME.accent },
  { id: "endpoint",   label: "Endpoint Security",    icon: "💻", color: "#7c3aed" },
  { id: "data",       label: "Data Protection",      icon: "🗄", color: THEME.success },
  { id: "identity",   label: "Identity & Access",    icon: "🔑", color: THEME.mid },
  { id: "monitoring", label: "Threat Intelligence",  icon: "📡", color: THEME.warn },
];

// ─── Utility helpers ────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rand  = (lo, hi)    => lo + Math.random() * (hi - lo);
const randInt = (lo, hi)  => Math.floor(rand(lo, hi + 1));
const fmt   = (n, d = 0)  => n.toLocaleString(undefined, { maximumFractionDigits: d });

function riskScore(allocation, attackPhase, scenario) {
  const defense = (allocation[scenario.id] || 0) / DEFENSE_BUDGET;
  const attackStrength = (attackPhase + 1) / scenario.phases.length;
  return clamp(attackStrength * (1 - defense * 0.85) * 100, 0, 100);
}

function systemicRisk(scores) {
  return Object.entries(scores).reduce((acc, [id, score]) => {
    return acc + score * SCENARIOS[id].riskWeight;
  }, 0);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HexGrid({ active }) {
  const hexes = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      opacity: 0.07, pointerEvents: "none",
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 58,17 58,46 30,61 2,46 2,17"
              fill="none" stroke="#00d4ff" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)"/>
      </svg>
    </div>
  );
}

function RadarChart({ scores }) {
  const cx = 120, cy = 120, r = 90;
  const labels = Object.keys(SCENARIOS);
  const n = labels.length;
  const angle = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;

  const rings = [0.25, 0.5, 0.75, 1];
  const ringPaths = rings.map(f => {
    const pts = labels.map((_, i) => {
      const a = angle(i);
      return `${cx + Math.cos(a) * r * f},${cy + Math.sin(a) * r * f}`;
    });
    return `M${pts.join("L")}Z`;
  });

  const dataPath = labels.map((id, i) => {
    const a = angle(i);
    const v = (scores[id] || 0) / 100;
    return `${cx + Math.cos(a) * r * v},${cy + Math.sin(a) * r * v}`;
  }).join("L");

  return (
    <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: 240 }}>
      {ringPaths.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke="#0d2640" strokeWidth="1" strokeDasharray="3,3"/>
      ))}
      {labels.map((_, i) => {
        const a = angle(i);
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="#0d2640" strokeWidth="1"/>
        );
      })}
      <path d={`M${dataPath}Z`}
        fill="rgba(255,26,75,0.2)" stroke={THEME.danger} strokeWidth="2"/>
      {labels.map((id, i) => {
        const a = angle(i);
        const v = (scores[id] || 0) / 100;
        return (
          <circle key={id}
            cx={cx + Math.cos(a) * r * v}
            cy={cy + Math.sin(a) * r * v}
            r={4} fill={THEME.danger} stroke="#030b14" strokeWidth="1.5"/>
        );
      })}
      {labels.map((id, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (r + 18);
        const ly = cy + Math.sin(a) * (r + 18);
        return (
          <text key={id} x={lx} y={ly + 4}
            textAnchor="middle" fontSize="10" fill={THEME.muted}
            fontFamily="'Share Tech Mono', monospace">
            {SCENARIOS[id].icon}
          </text>
        );
      })}
    </svg>
  );
}

function LiveLogFeed({ logs }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  const levelColor = (level) => {
    if (level === "CRITICAL") return THEME.danger;
    if (level === "WARN")     return THEME.warn;
    if (level === "INFO")     return THEME.accent;
    return THEME.success;
  };

  return (
    <div ref={ref} style={{
      height: 180, overflowY: "auto", fontFamily: "'Share Tech Mono', monospace",
      fontSize: 11, lineHeight: 1.7,
      scrollbarWidth: "thin", scrollbarColor: `${THEME.border} transparent`,
    }}>
      {logs.slice(-40).map((log, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "1px 0",
          opacity: i < logs.length - 20 ? 0.4 : 1, transition: "opacity 0.3s" }}>
          <span style={{ color: THEME.muted, flexShrink: 0 }}>{log.time}</span>
          <span style={{ color: levelColor(log.level), flexShrink: 0, width: 58 }}>
            [{log.level}]
          </span>
          <span style={{ color: THEME.text }}>{log.msg}</span>
        </div>
      ))}
    </div>
  );
}

function GaugeBar({ value, max = 100, color = THEME.accent, label, sublabel }) {
  const pct = clamp((value / max) * 100, 0, 100);
  const c = value > 70 ? THEME.danger : value > 40 ? THEME.warn : color;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        marginBottom: 4, fontFamily: "'Share Tech Mono', monospace" }}>
        <span style={{ fontSize: 11, color: THEME.muted }}>{label}</span>
        <span style={{ fontSize: 12, color: c, fontWeight: 700 }}>
          {fmt(value, 1)}{sublabel}
        </span>
      </div>
      <div style={{ height: 6, background: THEME.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${c}aa, ${c})`,
          borderRadius: 3,
          boxShadow: `0 0 8px ${c}66`,
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
        }}/>
      </div>
    </div>
  );
}

function PhaseTimeline({ phases, currentPhase, color }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {phases.map((p, i) => {
        const done = i < currentPhase;
        const active = i === currentPhase;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              padding: "3px 10px", borderRadius: 4,
              fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
              border: `1px solid ${active ? color : done ? `${color}55` : THEME.border}`,
              color: active ? color : done ? `${color}88` : THEME.muted,
              background: active ? `${color}18` : "transparent",
              boxShadow: active ? `0 0 12px ${color}44` : "none",
              transition: "all 0.3s",
              whiteSpace: "nowrap",
            }}>
              {done ? "✓ " : active ? "▶ " : ""}{p}
            </div>
            {i < phases.length - 1 && (
              <span style={{ color: done ? `${color}66` : THEME.border, fontSize: 10 }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AllocationSlider({ cat, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12,
          color: THEME.text, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{cat.icon}</span>{cat.label}
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12,
          color: cat.color, fontWeight: 700 }}>{value}%</span>
      </div>
      <input type="range" min={0} max={40} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        disabled={disabled}
        style={{
          width: "100%", accentColor: cat.color,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}/>
    </div>
  );
}

function ScenarioCard({ scenario, phase, risk, allocation, isActive, onActivate, isRunning }) {
  const phaseColor = scenario.color;
  const riskColor = risk > 70 ? THEME.danger : risk > 40 ? THEME.warn : THEME.success;

  return (
    <div onClick={isRunning ? undefined : onActivate}
      style={{
        border: `1px solid ${isActive ? phaseColor : THEME.border}`,
        borderRadius: 10,
        background: isActive ? `${phaseColor}08` : THEME.panel,
        padding: 16,
        cursor: isRunning ? "default" : "pointer",
        transition: "all 0.3s",
        boxShadow: isActive ? `0 0 20px ${phaseColor}22` : "none",
        position: "relative",
        overflow: "hidden",
      }}>
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${phaseColor}, transparent)`,
          animation: "scanline 2s linear infinite",
        }}/>
      )}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 20, marginBottom: 2 }}>{scenario.icon}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, color: phaseColor, letterSpacing: 1 }}>
            {scenario.name}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: THEME.muted,
            fontFamily: "'Share Tech Mono', monospace" }}>RISK SCORE</div>
          <div style={{ fontSize: 22, fontFamily: "'Bebas Neue', sans-serif",
            color: riskColor, lineHeight: 1 }}>
            {fmt(risk, 0)}%
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: THEME.muted, margin: "0 0 10px",
        fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.5 }}>
        {scenario.description}
      </p>
      {isActive && phase >= 0 && (
        <PhaseTimeline phases={scenario.phases} currentPhase={phase} color={phaseColor}/>
      )}
      {!isActive && (
        <div style={{ fontSize: 10, color: phaseColor,
          fontFamily: "'Share Tech Mono', monospace", marginTop: 6 }}>
          {isRunning ? "— STANDBY —" : "▶ CLICK TO SIMULATE"}
        </div>
      )}
    </div>
  );
}

// ─── Incident Response Quiz ─────────────────────────────────────────────────
const IR_QUESTIONS = {
  ddos: [
    {
      q: "A DDoS attack is flooding your payment gateway at 400Gbps. First action?",
      opts: [
        "Notify customers immediately",
        "Enable BGP blackholing on upstream ISP",
        "Reboot the gateway servers",
        "Escalate to CISO only",
      ],
      correct: 1,
      explain: "BGP blackholing diverts attack traffic upstream before it reaches infrastructure, buying time for scrubbing centers.",
    },
    {
      q: "Scrubbing center is active but latency remains elevated. Next step?",
      opts: [
        "Spin up additional origin servers",
        "Implement rate limiting with CAPTCHA challenges",
        "Disable the payment gateway temporarily",
        "File a police report",
      ],
      correct: 1,
      explain: "Rate limiting with CAPTCHAs differentiates bots from legitimate users while attack traffic is being scrubbed.",
    },
    {
      q: "The attack source is shifting IPs every 30s. Indicator of?",
      opts: [
        "Script kiddie tool",
        "Botnet with rotating C2 infrastructure",
        "Internal misconfiguration",
        "Load balancer failure",
      ],
      correct: 1,
      explain: "IP rotation with short TTLs is characteristic of botnet-driven attacks with centralized C2 control.",
    },
  ],
  ransomware: [
    {
      q: "EDR alerts: lateral movement from compromised workstation to SWIFT server. Priority?",
      opts: [
        "Image the workstation for forensics",
        "Immediately isolate the workstation from network",
        "Reset all user passwords",
        "Notify regulators",
      ],
      correct: 1,
      explain: "Network isolation stops lateral movement instantly. Forensics follows—stopping propagation is the critical first step.",
    },
    {
      q: "Ransomware has encrypted 15% of file shares. Backup integrity unknown. Action?",
      opts: [
        "Pay the ransom to minimize downtime",
        "Restore from backups immediately",
        "Validate backup integrity before restoration attempt",
        "Continue normal operations on unaffected systems",
      ],
      correct: 2,
      explain: "Ransomware often targets backups. Validating integrity before restoration prevents overwriting good data with encrypted copies.",
    },
    {
      q: "Malware note demands $8M in 48h. Board asks for recommendation. You say?",
      opts: [
        "Pay immediately to restore operations",
        "Negotiate to buy IR team time",
        "Engage FBI & cyber insurer; never commit to paying",
        "Ignore and restore from backups",
      ],
      correct: 2,
      explain: "FBI engagement is legally important; insurers manage ransom negotiations if needed. Payment without due diligence violates OFAC regulations if threat actors are sanctioned.",
    },
  ],
  breach: [
    {
      q: "UEBA flags an analyst downloading 40GB of customer PII at 2 AM. First response?",
      opts: [
        "Send the analyst an email asking for explanation",
        "Disable the account and capture network traffic immediately",
        "Alert the analyst's manager",
        "Wait for morning shift to investigate",
      ],
      correct: 1,
      explain: "Account disablement stops active exfiltration. Contemporaneous network capture provides evidence and scope assessment.",
    },
    {
      q: "Breach dwell time is estimated at 47 days. What's the primary regulatory concern?",
      opts: [
        "GDPR 72-hour notification breach",
        "SOX audit failure",
        "PCI-DSS immediate suspension of card processing",
        "All of the above",
      ],
      correct: 3,
      explain: "47-day dwell triggers GDPR notification violations, SOX internal control failures, and PCI-DSS card data compromise protocols simultaneously.",
    },
    {
      q: "Attacker used valid service account credentials. How to prevent recurrence?",
      opts: [
        "Change all service account passwords",
        "Implement PAM with just-in-time access and vault credentials",
        "Disable all service accounts",
        "Add MFA to service accounts",
      ],
      correct: 1,
      explain: "PAM with JIT access eliminates standing privileges. Vaulted credentials rotate automatically and are never exposed to users.",
    },
  ],
};

// ─── Main App ────────────────────────────────────────────────────────────────
export default function CyberDefenseSim() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]               = useState("sim");       // sim | allocate | training | risk
  const [activeScenario, setActive] = useState(null);
  const [phase, setPhase]           = useState(-1);
  const [isRunning, setIsRunning]   = useState(false);
  const [logs, setLogs]             = useState([]);
  const [riskScores, setRiskScores] = useState({ ddos: 42, ransomware: 61, breach: 38 });
  const [allocation, setAlloc]      = useState({ perimeter: 25, endpoint: 20, data: 18, identity: 22, monitoring: 15 });
  const [defAlloc, setDefAlloc]     = useState({ ddos: 30, ransomware: 35, breach: 35 });
  const [quizIdx, setQuizIdx]       = useState(0);
  const [quizAnswer, setAnswer]     = useState(null);
  const [quizScore, setScore]       = useState(0);
  const [quizDone, setQuizDone]     = useState(false);
  const [activeTraining, setTraining] = useState("ddos");
  const [elapsedTime, setElapsed]   = useState(0);
  const [attackMetrics, setMetrics] = useState({ bandwidth: 0, requests: 0, systems: 0, records: 0 });

  const timerRef = useRef(null);
  const phaseRef = useRef(null);
  const startTime = useRef(null);

  // ── Log helper ─────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, level = "INFO") => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    setLogs(l => [...l, { time, level, msg }]);
  }, []);

  // ── Attack simulation ──────────────────────────────────────────────────────
  const PHASE_LOGS = {
    ddos: [
      ["INFO","Reconnaissance sweep detected from 192.0.2.0/24 — 4,200 probes/sec",
       "WARN","SYN flood initiated — 2.8M packets/sec targeting TCP 443",
       "INFO","BGP advertisement anomaly detected — upstream ISP notified"],
      ["WARN","Amplification factor 38x via open NTP reflectors",
       "CRITICAL","Bandwidth spike: 180Gbps → scrubbing center threshold reached",
       "INFO","CDN rate limiting active — 82% traffic identified as malicious"],
      ["CRITICAL","Peak load: 412Gbps — payment gateway latency 4,200ms",
       "CRITICAL","3 of 8 API endpoints responding — partial service degradation",
       "WARN","Botnet C2 rotation detected — 2,400 unique source IPs"],
      ["WARN","Attack vector shifting to application layer (HTTP flood)",
       "INFO","BGP blackholing active — attack traffic rerouted",
       "SUCCESS","Service availability recovering — latency normalizing"],
    ],
    ransomware: [
      ["WARN","Phishing email with malicious macro — 3 staff clicked",
       "INFO","Macro execution detected — sandbox detonation triggered",
       "CRITICAL","Credential harvester active — LSASS memory access attempt"],
      ["CRITICAL","Privilege escalation: local admin → domain admin",
       "WARN","Kerberoasting attack detected in AD event logs",
       "CRITICAL","Lateral movement: 7 workstations compromised via SMB"],
      ["CRITICAL","Ransomware binary staged on file server FS-02",
       "WARN","Shadow copy deletion: vssadmin.exe /delete observed",
       "CRITICAL","Encryption commencing — 15% file shares affected"],
      ["CRITICAL","SWIFT messaging server targeted — EMERGENCY ISOLATION",
       "WARN","Ransom note dropped: $8M demand in 48 hours",
       "INFO","Incident response team engaged — forensic imaging initiated"],
    ],
    breach: [
      ["INFO","Spear phishing with credential harvesting link — analyst account compromised",
       "WARN","Unusual authentication: Singapore IP for NYC-based account",
       "INFO","MFA bypass via SIM swap — investigating telecom provider"],
      ["WARN","Internal network scan from compromised account — 840 hosts enumerated",
       "INFO","Database schema discovery queries detected in SIEM",
       "CRITICAL","Trading algorithm repository accessed — IP theft risk"],
      ["CRITICAL","Bulk SELECT on customer_pii table — 2.4M records accessed",
       "WARN","Data staged in encrypted archives — exfil staging detected",
       "INFO","DLP alert suppressed by attacker — investigating policy gap"],
      ["CRITICAL","40GB exfiltration via DNS tunneling to external C2",
       "WARN","Honeytoken triggered — 'db_admin_backup' credential used externally",
       "INFO","Incident declared — forensics & regulatory notification initiated"],
    ],
  };

  const runSimulation = useCallback((scenarioId) => {
    if (isRunning) return;
    setActive(scenarioId);
    setIsRunning(true);
    setPhase(0);
    startTime.current = Date.now();

    const scenario = SCENARIOS[scenarioId];
    addLog(`▶ SIMULATION STARTED: ${scenario.name}`, "INFO");
    addLog(`Defense posture: ${defAlloc[scenarioId]}% allocated`, "INFO");

    let currentPhase = 0;
    const phaseDuration = 5000;

    const runPhase = () => {
      if (currentPhase >= scenario.phases.length) {
        setIsRunning(false);
        addLog(`■ SIMULATION COMPLETE: ${scenario.name}`, "INFO");
        const finalRisk = riskScore(defAlloc, scenario.phases.length - 1, scenario);
        setRiskScores(prev => ({ ...prev, [scenarioId]: finalRisk }));
        addLog(`Final risk score: ${finalRisk.toFixed(1)}% — ${finalRisk > 60 ? "CRITICAL EXPOSURE" : finalRisk > 30 ? "MODERATE RISK" : "CONTAINED"}`,
          finalRisk > 60 ? "CRITICAL" : finalRisk > 30 ? "WARN" : "INFO");
        return;
      }

      setPhase(currentPhase);
      const phaseLogs = PHASE_LOGS[scenarioId][currentPhase];
      phaseLogs.forEach((msg, i) => {
        if (i % 2 === 1) {
          setTimeout(() => addLog(msg, phaseLogs[i - 1]), i * 600);
        }
      });

      const score = riskScore(defAlloc, currentPhase, scenario);
      setRiskScores(prev => ({ ...prev, [scenarioId]: score }));

      if (scenarioId === "ddos") {
        setMetrics(m => ({
          ...m,
          bandwidth: clamp(rand(50, 420) * (1 - defAlloc.ddos / 200), 10, 420),
          requests: randInt(100000, 4000000),
        }));
      } else if (scenarioId === "ransomware") {
        setMetrics(m => ({ ...m, systems: randInt(1, 40) }));
      } else {
        setMetrics(m => ({ ...m, records: randInt(10000, 2400000) }));
      }

      currentPhase++;
      phaseRef.current = setTimeout(runPhase, phaseDuration);
    };

    phaseRef.current = setTimeout(runPhase, 500);
  }, [isRunning, defAlloc, addLog]);

  const stopSimulation = useCallback(() => {
    clearTimeout(phaseRef.current);
    setIsRunning(false);
    setPhase(-1);
    addLog("■ Simulation terminated by operator", "WARN");
  }, [addLog]);

  // ── Allocation total ───────────────────────────────────────────────────────
  const allocTotal = Object.values(allocation).reduce((a, b) => a + b, 0);
  const defTotal   = Object.values(defAlloc).reduce((a, b) => a + b, 0);
  const sysRisk    = systemicRisk(riskScores);

  // ── Quiz handlers ──────────────────────────────────────────────────────────
  const questions = IR_QUESTIONS[activeTraining];
  const currentQ  = questions[quizIdx];

  const handleAnswer = (idx) => {
    if (quizAnswer !== null) return;
    setAnswer(idx);
    if (idx === currentQ.correct) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (quizIdx < questions.length - 1) {
      setQuizIdx(q => q + 1);
      setAnswer(null);
    } else {
      setQuizDone(true);
    }
  };

  const resetQuiz = () => {
    setQuizIdx(0);
    setAnswer(null);
    setScore(0);
    setQuizDone(false);
  };

  const handleTrainingSwitch = (id) => {
    setTraining(id);
    resetQuiz();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const tabStyle = (id) => ({
    padding: "10px 20px",
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 16,
    letterSpacing: 1.5,
    border: "none",
    borderBottom: `2px solid ${tab === id ? THEME.accent : "transparent"}`,
    background: "transparent",
    color: tab === id ? THEME.accent : THEME.muted,
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: THEME.bg,
      color: THEME.text,
      fontFamily: "'Share Tech Mono', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #0d2640; border-radius: 2px; }
        @keyframes scanline { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .blink { animation: pulse 1.5s ease-in-out infinite; }
        .fade-in { animation: fadeIn 0.4s ease both; }
      `}</style>

      <HexGrid />

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${THEME.border}`,
        padding: "0 24px",
        background: `${THEME.panel}ee`,
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
            <div style={{
              width: 36, height: 36, border: `2px solid ${THEME.accent}`,
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: `0 0 16px ${THEME.accent}44`,
            }}>🏦</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, color: THEME.accent, letterSpacing: 2 }}>
                FINSHIELD CYBER RANGE
              </div>
              <div style={{ fontSize: 9, color: THEME.muted }}>
                FINANCIAL INSTITUTION DEFENSE SIMULATION v2.4
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: THEME.muted }}>SYSTEMIC RISK</div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 24,
                color: sysRisk > 60 ? THEME.danger : sysRisk > 35 ? THEME.warn : THEME.success,
                lineHeight: 1,
              }}>
                {fmt(sysRisk, 1)}%
              </div>
            </div>
            {isRunning && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", border: `1px solid ${THEME.danger}`,
                borderRadius: 6, background: `${THEME.danger}15`,
              }}>
                <div className="blink" style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: THEME.danger,
                }}/>
                <span style={{ color: THEME.danger, fontSize: 11, fontWeight: 700 }}>
                  ATTACK ACTIVE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", gap: 4, maxWidth: 1280, margin: "0 auto" }}>
          {[
            ["sim",      "Attack Simulation"],
            ["allocate", "Defense Allocation"],
            ["training", "IR Training"],
            ["risk",     "Risk Assessment"],
          ].map(([id, label]) => (
            <button key={id} style={tabStyle(id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>

        {/* ════════════════════════════════════════
            TAB: ATTACK SIMULATION
        ════════════════════════════════════════ */}
        {tab === "sim" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {Object.values(SCENARIOS).map(s => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  phase={activeScenario === s.id ? phase : -1}
                  risk={riskScores[s.id]}
                  allocation={defAlloc}
                  isActive={activeScenario === s.id}
                  onActivate={() => runSimulation(s.id)}
                  isRunning={isRunning}
                />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              {/* Live log */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 16, color: THEME.accent, letterSpacing: 1 }}>
                    ◉ SIEM LIVE FEED
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isRunning && (
                      <button onClick={stopSimulation} style={{
                        padding: "5px 14px", border: `1px solid ${THEME.danger}`,
                        borderRadius: 5, background: `${THEME.danger}15`,
                        color: THEME.danger, cursor: "pointer", fontSize: 11,
                      }}>■ HALT</button>
                    )}
                    <button onClick={() => setLogs([])} style={{
                      padding: "5px 14px", border: `1px solid ${THEME.border}`,
                      borderRadius: 5, background: "transparent",
                      color: THEME.muted, cursor: "pointer", fontSize: 11,
                    }}>CLEAR</button>
                  </div>
                </div>
                {logs.length === 0
                  ? <div style={{ color: THEME.muted, fontSize: 12, padding: "20px 0",
                      textAlign: "center" }}>Select a scenario to begin simulation</div>
                  : <LiveLogFeed logs={logs}/>
                }
              </div>

              {/* Live metrics */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 16,
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, color: THEME.accent, letterSpacing: 1, marginBottom: 16 }}>
                  THREAT METRICS
                </div>

                {activeScenario === "ddos" && (
                  <>
                    <GaugeBar value={attackMetrics.bandwidth} max={420}
                      color={THEME.warn} label="BANDWIDTH (Gbps)" sublabel=" Gbps"/>
                    <GaugeBar value={Math.min(attackMetrics.requests / 40000, 100)} max={100}
                      color={THEME.danger} label="REQUEST RATE" sublabel="K rps"/>
                    <GaugeBar value={clamp(100 - riskScores.ddos, 0, 100)} max={100}
                      color={THEME.success} label="AVAILABILITY" sublabel="%"/>
                  </>
                )}
                {activeScenario === "ransomware" && (
                  <>
                    <GaugeBar value={attackMetrics.systems} max={40}
                      color="#b44fff" label="COMPROMISED HOSTS" sublabel=" hosts"/>
                    <GaugeBar value={riskScores.ransomware} max={100}
                      color={THEME.danger} label="ENCRYPTION SPREAD" sublabel="%"/>
                    <GaugeBar value={defAlloc.ransomware} max={100}
                      color={THEME.success} label="CONTAINMENT BUDGET" sublabel="%"/>
                  </>
                )}
                {activeScenario === "breach" && (
                  <>
                    <GaugeBar value={Math.min(attackMetrics.records / 24000, 100)} max={100}
                      color={THEME.success} label="RECORDS EXFILTRATED" sublabel="K"/>
                    <GaugeBar value={riskScores.breach} max={100}
                      color={THEME.danger} label="EXPOSURE SCORE" sublabel="%"/>
                    <GaugeBar value={defAlloc.breach} max={100}
                      color={THEME.accent} label="DLP COVERAGE" sublabel="%"/>
                  </>
                )}
                {!activeScenario && (
                  <div style={{ color: THEME.muted, fontSize: 11, textAlign: "center",
                    padding: "30px 0" }}>
                    No active simulation
                  </div>
                )}

                {/* Risk breakdown */}
                <div style={{ marginTop: 16, paddingTop: 16,
                  borderTop: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>
                    SCENARIO RISK SCORES
                  </div>
                  {Object.values(SCENARIOS).map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: THEME.muted }}>
                        {s.icon} {s.name}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: riskScores[s.id] > 60 ? THEME.danger
                             : riskScores[s.id] > 35 ? THEME.warn
                             : THEME.success,
                      }}>
                        {fmt(riskScores[s.id], 1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: DEFENSE ALLOCATION
        ════════════════════════════════════════ */}
        {tab === "allocate" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Capability allocation */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 20,
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, color: THEME.accent, letterSpacing: 1, marginBottom: 4 }}>
                  SECURITY CAPABILITY BUDGET
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
                  Allocate your security budget across defensive layers
                </div>

                {DEFENSE_CATEGORIES.map(cat => (
                  <AllocationSlider
                    key={cat.id}
                    cat={cat}
                    value={allocation[cat.id]}
                    onChange={v => {
                      const newAlloc = { ...allocation, [cat.id]: v };
                      setAlloc(newAlloc);
                    }}
                    disabled={false}
                  />
                ))}

                <div style={{
                  padding: "12px 14px", borderRadius: 8, marginTop: 8,
                  background: allocTotal > DEFENSE_BUDGET
                    ? `${THEME.danger}15` : `${THEME.success}10`,
                  border: `1px solid ${allocTotal > DEFENSE_BUDGET ? THEME.danger : THEME.border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 12 }}>Total Allocation</span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
                    color: allocTotal > DEFENSE_BUDGET ? THEME.danger : THEME.success,
                  }}>{allocTotal}%</span>
                </div>

                {allocTotal > DEFENSE_BUDGET && (
                  <div style={{ fontSize: 11, color: THEME.danger, marginTop: 8 }}>
                    ⚠ Over budget by {allocTotal - DEFENSE_BUDGET}% — reduce allocations
                  </div>
                )}
              </div>

              {/* Scenario defense split */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 20,
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, color: THEME.accent, letterSpacing: 1, marginBottom: 4 }}>
                  THREAT COVERAGE PRIORITY
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
                  Distribute defensive investment across threat scenarios (total: 100%)
                </div>

                {Object.values(SCENARIOS).map(s => (
                  <div key={s.id} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: THEME.text, display: "flex",
                        gap: 6, alignItems: "center" }}>
                        <span>{s.icon}</span>{s.name}
                      </span>
                      <span style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>
                        {defAlloc[s.id]}%
                      </span>
                    </div>
                    <input type="range" min={5} max={60} value={defAlloc[s.id]}
                      onChange={e => {
                        setDefAlloc(d => ({ ...d, [s.id]: parseInt(e.target.value) }));
                      }}
                      style={{ width: "100%", accentColor: s.color }}/>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {s.defenses.map(d => (
                        <span key={d} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 3,
                          border: `1px solid ${s.color}44`,
                          color: `${s.color}99`,
                        }}>{d}</span>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 8, padding: "12px 14px", borderRadius: 8,
                  background: Math.abs(defTotal - 100) > 5
                    ? `${THEME.warn}10` : `${THEME.success}10`,
                  border: `1px solid ${THEME.border}`,
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 12 }}>Combined Coverage</span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
                    color: Math.abs(defTotal - 100) > 10 ? THEME.warn : THEME.success,
                  }}>{defTotal}%</span>
                </div>
              </div>

              {/* Defense effectiveness preview */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 20,
                gridColumn: "1 / -1",
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, color: THEME.accent, letterSpacing: 1, marginBottom: 16 }}>
                  PROJECTED DEFENSE EFFECTIVENESS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {DEFENSE_CATEGORIES.map(cat => {
                    const v = allocation[cat.id];
                    const eff = Math.min(v * 2.5, 100);
                    return (
                      <div key={cat.id} style={{
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 8, padding: 14, textAlign: "center",
                        background: `${cat.color}08`,
                      }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{cat.icon}</div>
                        <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8,
                          lineHeight: 1.3 }}>{cat.label}</div>
                        <div style={{
                          fontFamily: "'Bebas Neue', sans-serif", fontSize: 26,
                          color: eff > 60 ? cat.color : eff > 30 ? THEME.warn : THEME.danger,
                        }}>{fmt(eff, 0)}%</div>
                        <div style={{ fontSize: 9, color: THEME.muted }}>effectiveness</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: IR TRAINING
        ════════════════════════════════════════ */}
        {tab === "training" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
              {/* Scenario selector */}
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, color: THEME.accent, letterSpacing: 1,
                  marginBottom: 12 }}>
                  SELECT SCENARIO
                </div>
                {Object.values(SCENARIOS).map(s => (
                  <div key={s.id} onClick={() => handleTrainingSwitch(s.id)}
                    style={{
                      padding: 14, borderRadius: 8, marginBottom: 10, cursor: "pointer",
                      border: `1px solid ${activeTraining === s.id ? s.color : THEME.border}`,
                      background: activeTraining === s.id ? `${s.color}12` : THEME.panel,
                      transition: "all 0.2s",
                    }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 15, color: s.color }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 3,
                      lineHeight: 1.4 }}>{s.description}</div>
                  </div>
                ))}

                {/* Score card */}
                {!quizDone && (
                  <div style={{
                    marginTop: 8, padding: 14, borderRadius: 8,
                    border: `1px solid ${THEME.border}`, background: THEME.panel,
                  }}>
                    <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 4 }}>
                      PROGRESS
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 28, color: THEME.accent }}>
                      {quizIdx} / {questions.length}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>questions answered</div>
                    <div style={{ height: 4, background: THEME.border,
                      borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${(quizIdx / questions.length) * 100}%`,
                        background: THEME.accent,
                        transition: "width 0.4s",
                      }}/>
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz panel */}
              <div style={{
                border: `1px solid ${THEME.border}`,
                borderRadius: 10, background: THEME.panel, padding: 24,
              }}>
                {quizDone ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>
                      {quizScore === questions.length ? "🏆" : quizScore >= 2 ? "✅" : "📖"}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 40, color: THEME.accent, marginBottom: 8 }}>
                      {quizScore} / {questions.length} CORRECT
                    </div>
                    <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>
                      {quizScore === questions.length
                        ? "Outstanding IR competency — ready for incident command"
                        : quizScore >= 2
                        ? "Solid foundation — review missed scenarios for certification"
                        : "Additional training recommended — consult NIST IR playbooks"}
                    </div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                      <button onClick={resetQuiz} style={{
                        padding: "12px 28px", border: `1px solid ${THEME.accent}`,
                        borderRadius: 8, background: `${THEME.accent}15`,
                        color: THEME.accent, cursor: "pointer", fontSize: 13,
                        fontFamily: "'Share Tech Mono', monospace",
                      }}>↺ RETRY</button>
                      {Object.values(SCENARIOS).filter(s => s.id !== activeTraining).map(s => (
                        <button key={s.id} onClick={() => handleTrainingSwitch(s.id)} style={{
                          padding: "12px 20px", border: `1px solid ${THEME.border}`,
                          borderRadius: 8, background: "transparent",
                          color: THEME.muted, cursor: "pointer", fontSize: 12,
                          fontFamily: "'Share Tech Mono', monospace",
                        }}>{s.icon} {s.name}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 16, color: SCENARIOS[activeTraining].color, letterSpacing: 1 }}>
                        {SCENARIOS[activeTraining].icon} {SCENARIOS[activeTraining].name} — IR DRILL
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        Q{quizIdx + 1}/{questions.length}
                      </div>
                    </div>

                    <div style={{
                      padding: 18, borderRadius: 8,
                      border: `1px solid ${THEME.border}`,
                      background: `${THEME.bg}`,
                      marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.6 }}>
                        {currentQ.q}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                      {currentQ.opts.map((opt, i) => {
                        let bg = "transparent", border = THEME.border, color = THEME.text;
                        if (quizAnswer !== null) {
                          if (i === currentQ.correct) {
                            bg = `${THEME.success}18`; border = THEME.success; color = THEME.success;
                          } else if (i === quizAnswer && quizAnswer !== currentQ.correct) {
                            bg = `${THEME.danger}15`; border = THEME.danger; color = THEME.danger;
                          }
                        }
                        return (
                          <div key={i} onClick={() => handleAnswer(i)}
                            style={{
                              padding: "12px 16px", borderRadius: 8,
                              border: `1px solid ${border}`,
                              background: bg, color, cursor: quizAnswer === null ? "pointer" : "default",
                              fontSize: 12, lineHeight: 1.5, transition: "all 0.25s",
                              display: "flex", gap: 10, alignItems: "flex-start",
                            }}>
                            <span style={{ flexShrink: 0, width: 20, height: 20,
                              border: `1px solid ${border}`, borderRadius: 4,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700 }}>
                              {quizAnswer !== null
                                ? i === currentQ.correct ? "✓"
                                  : i === quizAnswer ? "✗"
                                  : String.fromCharCode(65 + i)
                                : String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {quizAnswer !== null && (
                      <div style={{
                        padding: 14, borderRadius: 8,
                        border: `1px solid ${quizAnswer === currentQ.correct ? THEME.success : THEME.warn}`,
                        background: quizAnswer === currentQ.correct
                          ? `${THEME.success}10` : `${THEME.warn}10`,
                        marginBottom: 16, fontSize: 12, lineHeight: 1.6,
                        color: quizAnswer === currentQ.correct ? THEME.success : THEME.text,
                      }}>
                        <strong>
                          {quizAnswer === currentQ.correct ? "✓ Correct. " : "✗ Incorrect. "}
                        </strong>
                        {currentQ.explain}
                      </div>
                    )}

                    {quizAnswer !== null && (
                      <button onClick={nextQuestion} style={{
                        padding: "12px 28px", border: `1px solid ${THEME.accent}`,
                        borderRadius: 8, background: `${THEME.accent}15`,
                        color: THEME.accent, cursor: "pointer", fontSize: 12,
                        fontFamily: "'Share Tech Mono', monospace",
                      }}>
                        {quizIdx < questions.length - 1 ? "NEXT QUESTION →" : "VIEW RESULTS →"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: RISK ASSESSMENT
        ════════════════════════════════════════ */}
        {tab === "risk" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
              {/* Radar + systemic score */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  border: `1px solid ${THEME.border}`, borderRadius: 10,
                  background: THEME.panel, padding: 20, textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 14, color: THEME.muted, letterSpacing: 1, marginBottom: 12 }}>
                    ATTACK SURFACE RADAR
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <RadarChart scores={riskScores}/>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: THEME.muted }}>COMPOSITE SYSTEMIC RISK</div>
                    <div style={{
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: 52,
                      color: sysRisk > 60 ? THEME.danger : sysRisk > 35 ? THEME.warn : THEME.success,
                      lineHeight: 1,
                    }}>{fmt(sysRisk, 1)}%</div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                      {sysRisk > 60 ? "CRITICAL — Immediate remediation required"
                       : sysRisk > 35 ? "ELEVATED — Priority hardening recommended"
                       : "ACCEPTABLE — Maintain current posture"}
                    </div>
                  </div>
                </div>

                {/* Regulatory impact */}
                <div style={{
                  border: `1px solid ${THEME.border}`, borderRadius: 10,
                  background: THEME.panel, padding: 20,
                }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 14, color: THEME.accent, letterSpacing: 1, marginBottom: 14 }}>
                    REGULATORY EXPOSURE
                  </div>
                  {[
                    { reg: "GDPR Art.33", risk: riskScores.breach,  icon: "🇪🇺" },
                    { reg: "PCI-DSS v4",  risk: riskScores.breach * 0.8, icon: "💳" },
                    { reg: "FFIEC CAT",   risk: sysRisk,            icon: "🏛" },
                    { reg: "SOX §302",    risk: riskScores.ransomware * 0.6, icon: "📋" },
                    { reg: "NYDFS 23",    risk: sysRisk * 0.9,      icon: "🗽" },
                  ].map(({ reg, risk, icon }) => (
                    <div key={reg} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 10, padding: "6px 10px",
                      borderRadius: 6,
                      background: risk > 60 ? `${THEME.danger}10`
                               : risk > 35 ? `${THEME.warn}08` : `${THEME.success}06`,
                    }}>
                      <span style={{ fontSize: 12, color: THEME.text }}>
                        {icon} {reg}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: risk > 60 ? THEME.danger : risk > 35 ? THEME.warn : THEME.success,
                      }}>
                        {risk > 60 ? "HIGH" : risk > 35 ? "MED" : "LOW"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.values(SCENARIOS).map(s => {
                  const sr = riskScores[s.id];
                  const rc = sr > 60 ? THEME.danger : sr > 35 ? THEME.warn : THEME.success;
                  return (
                    <div key={s.id} style={{
                      border: `1px solid ${THEME.border}`, borderRadius: 10,
                      background: THEME.panel, padding: 20,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 18, color: s.color, letterSpacing: 1 }}>
                            {s.icon} {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            Risk weight: {(s.riskWeight * 100).toFixed(0)}% of systemic score
                          </div>
                        </div>
                        <div style={{
                          padding: "6px 16px", borderRadius: 6,
                          background: `${rc}15`, border: `1px solid ${rc}`,
                          fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: rc,
                        }}>
                          {fmt(sr, 1)}%
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>
                            ATTACK PHASES
                          </div>
                          {s.phases.map((p, i) => (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              marginBottom: 6, fontSize: 11, color: THEME.text,
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: s.color, flexShrink: 0,
                                opacity: 0.6 + i * 0.1,
                              }}/>
                              {p}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>
                            ACTIVE DEFENSES
                          </div>
                          {s.defenses.map((d, i) => {
                            const coverage = defAlloc[s.id] / 4;
                            const isActive = coverage > i * 8;
                            return (
                              <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                marginBottom: 6, fontSize: 11,
                                color: isActive ? THEME.success : THEME.muted,
                              }}>
                                <span>{isActive ? "✓" : "○"}</span> {d}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{
                        marginTop: 14, height: 6, background: THEME.border,
                        borderRadius: 3, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${sr}%`,
                          background: `linear-gradient(90deg, ${s.color}88, ${rc})`,
                          borderRadius: 3, transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                        }}/>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        marginTop: 4, fontSize: 9, color: THEME.muted }}>
                        <span>CONTAINED</span>
                        <span>CRITICAL EXPOSURE</span>
                      </div>
                    </div>
                  );
                })}

                {/* MITRE ATT&CK coverage */}
                <div style={{
                  border: `1px solid ${THEME.border}`, borderRadius: 10,
                  background: THEME.panel, padding: 20,
                }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 16, color: THEME.accent, letterSpacing: 1, marginBottom: 14 }}>
                    MITRE ATT&CK® COVERAGE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {[
                      ["Recon", 72], ["Resource Dev", 55], ["Initial Access", 68],
                      ["Execution", 61], ["Persistence", 44], ["Priv Esc", 38],
                      ["Defense Evasion", 29], ["Credential Access", 52], ["Discovery", 67],
                      ["Lateral Movement", 41], ["Collection", 58], ["C2", 63],
                      ["Exfiltration", 71], ["Impact", 48],
                    ].map(([tactic, cov]) => {
                      const adjusted = clamp(cov + (allocTotal - 100) * 0.3, 0, 100);
                      const c = adjusted > 60 ? THEME.success : adjusted > 40 ? THEME.mid : THEME.danger;
                      return (
                        <div key={tactic} style={{
                          padding: "8px 6px", borderRadius: 6, textAlign: "center",
                          border: `1px solid ${THEME.border}`,
                          background: `${c}10`,
                        }}>
                          <div style={{ fontSize: 14, fontFamily: "'Bebas Neue', sans-serif",
                            color: c }}>{fmt(adjusted, 0)}%</div>
                          <div style={{ fontSize: 8, color: THEME.muted, marginTop: 2,
                            lineHeight: 1.2 }}>{tactic}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}