import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "darts-plan-one";
const LADDER = { 1: 40, 2: 50, 3: 60, 4: 70 };

const emptyWeek = () => Array(7).fill(null);
const emptyData = () => ({
  tons: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
  ladder: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
  jdc: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
});

async function loadData() {
  try { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : emptyData(); }
  catch { return emptyData(); }
}
async function saveData(data) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}

const S = {
  card: { background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 12 },
  btn: (bg, sz = 14) => ({ padding: "12px 0", borderRadius: 14, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: sz, cursor: "pointer", width: "100%" }),
  bigBtn: (bg) => ({ padding: "28px 0", borderRadius: 20, border: "none", background: bg, color: "#fff", fontWeight: 800, fontSize: 20, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }),
  stat: { textAlign: "center" },
  statLabel: { fontSize: 10, color: "#9ca3af", fontWeight: 600 },
  statVal: (c = "#374151") => ({ fontSize: 20, fontWeight: 800, color: c }),
  progress: (pct, bg, done) => ({ height: "100%", borderRadius: 99, transition: "width 0.3s", width: `${Math.min(100, pct)}%`, background: done ? "#16a34a" : bg, display: "flex", alignItems: "center", justifyContent: "center" }),
};

function Rules({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#f8fafc", borderRadius: 16, marginBottom: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontWeight: 700, color: "#475569", fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 18, color: "#94a3b8" }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px", fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════
   TONS — dart by dart
   ═══════════════════════════════════ */
function Tons({ onSave }) {
  const [cur, setCur] = useState([]);
  const [log, setLog] = useState([]);
  const [darts, setDarts] = useState(0);
  const vals = { S: 20, D: 40, T: 60, X: 0 };

  const tap = (type) => {
    const next = [...cur, type];
    if (next.length === 3) {
      const miss = next.includes("X");
      const score = miss ? 0 : next.reduce((s, d) => s + vals[d], 0);
      setLog([...log, { d: next, score, ok: !miss }]);
      setDarts(darts + 3);
      setCur([]);
    } else setCur(next);
  };

  const undo = () => {
    if (cur.length > 0) setCur(cur.slice(0, -1));
    else if (log.length > 0) {
      const last = log[log.length - 1];
      setLog(log.slice(0, -1));
      setDarts(darts - 3);
      setCur(last.d.slice(0, 2));
    }
  };

  const valid = log.filter(v => v.ok);
  const c60 = valid.filter(v => v.score >= 60 && v.score < 100).length;
  const c100 = valid.filter(v => v.score >= 100 && v.score < 140).length;
  const c140 = valid.filter(v => v.score >= 140).length;
  const pts = c60 + c100 * 2 + c140 * 3;
  const done = pts >= 21;
  const label = { S: "20", D: "D20", T: "T20", X: "Miss" };
  const color = { S: "#059669", D: "#2563eb", T: "#7c3aed", X: "#dc2626" };
  const reset = () => { setCur([]); setLog([]); setDarts(0); };
  const save = () => { onSave({ c60, c100, c140, darts, pts }); reset(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Rules title="How to play TONS">
        <p><b>Goal:</b> Score 21 points. Only visits where ALL 3 darts land in the 20 segment count.</p>
        <p style={{ marginTop: 8 }}><b>Scoring:</b></p>
        <p>60+ visit = <b>1 point</b> &bull; 100+ = <b>2 points</b> &bull; 140+ = <b>3 points</b></p>
        <p style={{ marginTop: 8 }}>If ANY dart misses the 20s, that visit scores <b>zero</b>.</p>
        <p style={{ marginTop: 8 }}>Tap what each dart hits. After 3 darts the visit auto-scores. Play until 21 points then save.</p>
      </Rules>

      <div style={{ background: "#e5e7eb", borderRadius: 99, height: 40, position: "relative", overflow: "hidden" }}>
        <div style={S.progress((pts / 21) * 100, "#059669", done)}>{pts > 1 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{pts} / 21</span>}</div>
        {pts <= 1 && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#6b7280", fontSize: 16 }}>{pts} / 21</span>}
      </div>

      {done && (
        <div style={{ background: "#dcfce7", border: "3px solid #22c55e", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>21 POINTS!</div>
          <div style={{ fontSize: 14, color: "#15803d", marginTop: 4 }}>{darts} darts &bull; {(darts / pts).toFixed(1)} d/pt</div>
          <button onClick={save} style={{ ...S.btn("#16a34a", 16), marginTop: 12, padding: "14px 0" }}>Save Session</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {[0, 1, 2].map(i => {
          const thrown = i < cur.length;
          const active = i === cur.length;
          return (
            <div key={i} style={{
              width: 90, height: 90, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: active ? "3px dashed #eab308" : thrown ? `3px solid ${color[cur[i]]}` : "2px solid #d1d5db",
              background: thrown ? (cur[i] === "X" ? "#fef2f2" : "#f0fdf4") : active ? "#fefce8" : "#f9fafb"
            }}>
              {thrown ? (<><span style={{ fontSize: 22, fontWeight: 800, color: color[cur[i]] }}>{label[cur[i]]}</span><span style={{ fontSize: 11, color: "#9ca3af" }}>{vals[cur[i]]}</span></>) : (
                <span style={{ fontSize: 28, color: active ? "#eab308" : "#d1d5db" }}>{active ? "?" : ""}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, fontWeight: 600 }}>Dart {cur.length + 1} of 3 &bull; Visit #{log.length + 1}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[{ k: "S", lbl: "Single 20", sub: "20 pts", bg: "#059669" }, { k: "D", lbl: "Double 20", sub: "40 pts", bg: "#2563eb" }, { k: "T", lbl: "Treble 20", sub: "60 pts", bg: "#7c3aed" }, { k: "X", lbl: "Off 20s", sub: "no score", bg: "#dc2626" }].map(b => (
          <button key={b.k} onClick={() => tap(b.k)} style={S.bigBtn(b.bg)}>{b.lbl}<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>{b.sub}</span></button>
        ))}
      </div>

      {(cur.length > 0 || log.length > 0) && <button onClick={undo} style={{ ...S.btn("#e5e7eb"), color: "#6b7280" }}>Undo last dart</button>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", ...S.card, padding: 10 }}>
        {[{ l: "60+", v: c60, c: "#059669" }, { l: "100+", v: c100, c: "#2563eb" }, { l: "140+", v: c140, c: "#7c3aed" }, { l: "Darts", v: darts, c: "#374151" }, { l: "D/Pt", v: pts > 0 ? (darts / pts).toFixed(1) : "-", c: "#374151" }].map((st, i) => (
          <div key={i} style={S.stat}><div style={S.statLabel}>{st.l}</div><div style={S.statVal(st.c)}>{st.v}</div></div>
        ))}
      </div>

      {log.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>VISIT LOG</span></div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {[...log].reverse().map((v, idx) => {
              const num = log.length - idx;
              const tier = !v.ok ? "—" : v.score >= 140 ? "140+" : v.score >= 100 ? "100+" : "60+";
              const tc = !v.ok ? "#f87171" : v.score >= 140 ? "#7c3aed" : v.score >= 100 ? "#2563eb" : "#059669";
              return (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid #f3f4f6", opacity: v.ok ? 1 : 0.4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "#d1d5db", width: 22 }}>#{num}</span>
                    {v.d.map((d, di) => (<span key={di} style={{ padding: "2px 5px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: d === "X" ? "#fef2f2" : d === "T" ? "#f3e8ff" : d === "D" ? "#eff6ff" : "#ecfdf5", color: color[d] }}>{label[d]}</span>))}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12, color: tc }}>{v.ok ? `${v.score} (${tier})` : "NO SCORE"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!done && log.length > 0 && <button onClick={save} style={{ ...S.btn("#059669"), opacity: 0.7 }}>Save Early</button>}
      <button onClick={reset} style={{ ...S.btn("#fee2e2"), color: "#dc2626" }}>Reset Session</button>
    </div>
  );
}

/* ═══════════════════════════════════
   LADDER UP
   ═══════════════════════════════════ */
function LadderUp({ week, onSave }) {
  const start = LADDER[week] || 40;
  const [cur, setCur] = useState(start);
  const [hi, setHi] = useState(start);
  const [att, setAtt] = useState(0);
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState(1200);
  const [on, setOn] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setCur(start); setHi(start); setAtt(0); setHits(0); setTime(1200); setOn(false); if (ref.current) clearInterval(ref.current); }, [week]);
  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);

  const go = () => { if (on) return; setOn(true); ref.current = setInterval(() => setTime(p => { if (p <= 1) { clearInterval(ref.current); setOn(false); return 0; } return p - 1; }), 1000); };
  const pause = () => { clearInterval(ref.current); setOn(false); };
  const reset = () => { pause(); setCur(start); setHi(start); setAtt(0); setHits(0); setTime(1200); };
  const doHit = () => { const n = cur + 2; setCur(n); setHi(Math.max(hi, n)); setAtt(att + 1); setHits(hits + 1); if (!on) go(); };
  const doMiss = () => { setCur(Math.max(2, cur - 1)); setAtt(att + 1); if (!on) go(); };
  const save = () => { onSave({ start, finish: cur, highest: hi, attempts: att, hits, hitRate: att > 0 ? Math.round(hits / att * 100) : 0 }); reset(); };
  const m = Math.floor(time / 60), s = time % 60;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Rules title="How to play LADDER UP">
        <p><b>Goal:</b> Get as high a checkout as possible in 20 minutes.</p>
        <p style={{ marginTop: 8 }}>Start at <b>{start}</b> (Week {week}). 3 darts to hit the checkout.</p>
        <p><b>Hit</b> = move UP 2 &bull; <b>Miss</b> = drop DOWN 1</p>
        <p style={{ marginTop: 8 }}>Weekly starts: W1=40, W2=50, W3=60, W4=70.</p>
      </Rules>

      <div style={{ background: "#111827", borderRadius: 20, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>TIME REMAINING</div>
        <div style={{ fontSize: 56, fontFamily: "monospace", fontWeight: 800, color: time === 0 ? "#dc2626" : time < 120 ? "#f97316" : "#fff" }}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
        <div style={{ marginTop: 12 }}>
          {!on && time > 0 && <button onClick={go} style={{ padding: "8px 24px", borderRadius: 12, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{time < 1200 ? "Resume" : "Start Timer"}</button>}
          {on && <button onClick={pause} style={{ padding: "8px 24px", borderRadius: 12, border: "none", background: "#eab308", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Pause</button>}
        </div>
      </div>

      {time === 0 && (
        <div style={{ background: "#fef2f2", border: "3px solid #f87171", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#991b1b" }}>TIME'S UP!</div>
          <div style={{ fontSize: 14, color: "#b91c1c", marginTop: 4 }}>Finished: {cur} &bull; Change: {cur >= start ? "+" : ""}{cur - start}</div>
          <button onClick={save} style={{ ...S.btn("#2563eb", 16), marginTop: 12, padding: "14px 0" }}>Save Session</button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 24, padding: 28, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>CURRENT CHECKOUT</div>
        <div style={{ fontSize: 88, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{cur}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 8, fontSize: 13, color: "#9ca3af" }}>
          <span>Start: {start}</span><span>|</span><span>Best: <b style={{ color: "#2563eb" }}>{hi}</b></span><span>|</span>
          <span style={{ color: cur >= start ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{cur >= start ? "+" : ""}{cur - start}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button onClick={doHit} disabled={time === 0} style={{ ...S.bigBtn(time === 0 ? "#d1d5db" : "#22c55e"), padding: "36px 0", fontSize: 28, cursor: time === 0 ? "default" : "pointer" }}>HIT<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>checkout +2</span></button>
        <button onClick={doMiss} disabled={time === 0} style={{ ...S.bigBtn(time === 0 ? "#d1d5db" : "#ef4444"), padding: "36px 0", fontSize: 28, cursor: time === 0 ? "default" : "pointer" }}>MISS<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>failed -1</span></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", ...S.card, padding: 10 }}>
        {[{ l: "Attempts", v: att }, { l: "Hits", v: hits }, { l: "Hit %", v: att > 0 ? Math.round(hits / att * 100) + "%" : "-" }, { l: "Highest", v: hi }].map((st, i) => (
          <div key={i} style={S.stat}><div style={S.statLabel}>{st.l}</div><div style={S.statVal()}>{st.v}</div></div>
        ))}
      </div>

      {att > 0 && time > 0 && <button onClick={save} style={{ ...S.btn("#2563eb"), opacity: 0.7 }}>Save Early</button>}
      <button onClick={reset} style={{ ...S.btn("#fee2e2"), color: "#dc2626" }}>Reset Session</button>
    </div>
  );
}

/* ═══════════════════════════════════
   JDC CHALLENGE — Structured flow
   ═══════════════════════════════════ */
function JDCGame({ onSave }) {
  // Phase 0: Shanghai 10-15, Phase 1: Doubles RTW, Phase 2: Shanghai 15-20
  const [phase, setPhase] = useState(0);

  // Shanghai state: which number we're on, which dart (0-2), results per number
  const sh1Nums = [10, 11, 12, 13, 14, 15];
  const sh2Nums = [15, 16, 17, 18, 19, 20];
  const dblNums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, "Bull"];

  // Phase 1: Shanghai 10-15
  const [sh1Idx, setSh1Idx] = useState(0); // which number index
  const [sh1Dart, setSh1Dart] = useState(0); // which dart 0-2
  const [sh1Results, setSh1Results] = useState({}); // { 10: { darts: ["S","D","X"], score: 60 }, ... }
  const [sh1Score, setSh1Score] = useState(0);
  const [sh1Shanghais, setSh1Shanghais] = useState(0);

  // Phase 2: Doubles RTW
  const [dblIdx, setDblIdx] = useState(0);
  const [dblResults, setDblResults] = useState({});
  const [dblScore, setDblScore] = useState(0);

  // Phase 3: Shanghai 15-20
  const [sh2Idx, setSh2Idx] = useState(0);
  const [sh2Dart, setSh2Dart] = useState(0);
  const [sh2Results, setSh2Results] = useState({});
  const [sh2Score, setSh2Score] = useState(0);
  const [sh2Shanghais, setSh2Shanghais] = useState(0);

  const [finished, setFinished] = useState([false, false, false]);

  const total = sh1Score + dblScore + sh2Score;

  const resetAll = () => {
    setSh1Idx(0); setSh1Dart(0); setSh1Results({}); setSh1Score(0); setSh1Shanghais(0);
    setDblIdx(0); setDblResults({}); setDblScore(0);
    setSh2Idx(0); setSh2Dart(0); setSh2Results({}); setSh2Score(0); setSh2Shanghais(0);
    setFinished([false, false, false]); setPhase(0);
  };

  const save = () => { onSave({ sh1: sh1Score, dbl: dblScore, sh2: sh2Score, total }); resetAll(); };

  const markFinished = (pi) => { const f = [...finished]; f[pi] = true; setFinished(f); };

  // ── Shanghai throw handler ──
  const shanghaiThrow = (phaseIdx, nums, idx, setIdx, dart, setDart, results, setResults, score, setScore, shanghais, setShanghais, type) => {
    const num = nums[idx];
    const key = num;
    const existing = results[key] || { darts: [], score: 0, types: new Set() };

    let dartScore = 0;
    let dartType = type;
    if (type === "S") dartScore = num;
    else if (type === "D") dartScore = num * 2;
    else if (type === "T") dartScore = num * 3;
    // X = miss = 0

    const newDarts = [...existing.darts, type];
    const newTypes = new Set(existing.types);
    if (type !== "X") newTypes.add(type);
    const newScore = existing.score + dartScore;

    const updated = { ...results, [key]: { darts: newDarts, score: newScore, types: newTypes } };
    setResults(updated);
    setScore(score + dartScore);

    const nextDart = dart + 1;
    if (nextDart >= 3) {
      // Check for Shanghai (hit S, D and T of same number)
      if (newTypes.has("S") && newTypes.has("D") && newTypes.has("T")) {
        setShanghais(shanghais + 1);
        setScore(s => s + 100);
        updated[key].shanghai = true;
      }
      // Move to next number
      const nextIdx = idx + 1;
      if (nextIdx >= nums.length) {
        markFinished(phaseIdx);
        // Auto-advance to next phase
        if (phaseIdx === 0 && !finished[1]) setPhase(1);
        else if (phaseIdx === 2 && !finished[0]) setPhase(0);
      } else {
        setIdx(nextIdx);
      }
      setDart(0);
    } else {
      setDart(nextDart);
    }
  };

  // ── Doubles throw handler ──
  const doublesThrow = (hit) => {
    const num = dblNums[dblIdx];
    const pts = hit ? (num === "Bull" ? 100 : 50) : 0;
    setDblResults({ ...dblResults, [num]: hit });
    setDblScore(dblScore + pts);
    const nextIdx = dblIdx + 1;
    if (nextIdx >= dblNums.length) {
      markFinished(1);
      if (!finished[2]) setPhase(2);
      else if (!finished[0]) setPhase(0);
    } else {
      setDblIdx(nextIdx);
    }
  };

  const allDone = finished[0] && finished[1] && finished[2];

  // ── Phase labels for tabs ──
  const phaseLabels = [
    { n: "SH 10-15", done: finished[0], score: sh1Score, target: 100 },
    { n: "Doubles", done: finished[1], score: dblScore, target: 100 },
    { n: "SH 15-20", done: finished[2], score: sh2Score, target: 200 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Rules title="How to play JDC CHALLENGE">
        <p>Designed by Steve 'Bomber' Brown. Three phases. Target: <b>400+ total</b>.</p>
        <p style={{ marginTop: 8 }}><b>Shanghai 10-15:</b> 3 darts at each number (10, 11, 12, 13, 14, 15). Hit S+D+T of same number = Shanghai (+100 bonus). Target: 100.</p>
        <p style={{ marginTop: 8 }}><b>Doubles RTW:</b> 1 dart at each double (D1 to D20, then Bull). Hit = 50pts, Bull = 100pts. Target: 100.</p>
        <p style={{ marginTop: 8 }}><b>Shanghai 15-20:</b> Same as first but numbers 15-20. Target: 200.</p>
        <p style={{ marginTop: 8 }}>The scorer guides you through each dart automatically. Just tap what you hit!</p>
      </Rules>

      {/* Phase tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 14, padding: 4 }}>
        {phaseLabels.map((p, i) => (
          <button key={i} onClick={() => setPhase(i)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10, border: "none",
            background: phase === i ? "#7c3aed" : "transparent", color: phase === i ? "#fff" : p.done ? "#22c55e" : "#6b7280",
            fontWeight: 700, fontSize: 11, cursor: "pointer", position: "relative"
          }}>
            {p.done && <span style={{ marginRight: 4 }}>✓</span>}{p.n}
          </button>
        ))}
      </div>

      {/* Total progress */}
      <div style={{ background: "#e5e7eb", borderRadius: 99, height: 40, position: "relative", overflow: "hidden" }}>
        <div style={S.progress((total / 400) * 100, "#8b5cf6", total >= 400)}>
          {total > 20 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{total} / 400</span>}
        </div>
        {total <= 20 && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#6b7280", fontSize: 16 }}>{total} / 400</span>}
      </div>

      {allDone && (
        <div style={{ background: total >= 400 ? "#f3e8ff" : "#fef2f2", border: `3px solid ${total >= 400 ? "#a78bfa" : "#fca5a5"}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: total >= 400 ? "#5b21b6" : "#991b1b" }}>{total >= 400 ? "TARGET HIT!" : "ALL PHASES DONE"} — {total}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>SH 10-15: {sh1Score} &bull; Doubles: {dblScore} &bull; SH 15-20: {sh2Score}</div>
          <button onClick={save} style={{ ...S.btn(total >= 400 ? "#7c3aed" : "#6b7280", 16), marginTop: 12, padding: "14px 0" }}>Save Session</button>
        </div>
      )}

      {/* ── SHANGHAI PHASE RENDERER ── */}
      {(phase === 0 && !finished[0]) && (
        <ShanghaiFlow
          label="Shanghai 10-15"
          nums={sh1Nums}
          idx={sh1Idx}
          dart={sh1Dart}
          results={sh1Results}
          score={sh1Score}
          target={100}
          shanghais={sh1Shanghais}
          onThrow={(type) => shanghaiThrow(0, sh1Nums, sh1Idx, setSh1Idx, sh1Dart, setSh1Dart, sh1Results, setSh1Results, sh1Score, setSh1Score, sh1Shanghais, setSh1Shanghais, type)}
        />
      )}
      {(phase === 0 && finished[0]) && <PhaseDone label="Shanghai 10-15" score={sh1Score} target={100} results={sh1Results} nums={sh1Nums} shanghais={sh1Shanghais} />}

      {(phase === 1 && !finished[1]) && (
        <DoublesFlow
          nums={dblNums}
          idx={dblIdx}
          results={dblResults}
          score={dblScore}
          onThrow={doublesThrow}
        />
      )}
      {(phase === 1 && finished[1]) && <PhaseDone label="Doubles RTW" score={dblScore} target={100} results={dblResults} nums={dblNums} isDoubles />}

      {(phase === 2 && !finished[2]) && (
        <ShanghaiFlow
          label="Shanghai 15-20"
          nums={sh2Nums}
          idx={sh2Idx}
          dart={sh2Dart}
          results={sh2Results}
          score={sh2Score}
          target={200}
          shanghais={sh2Shanghais}
          onThrow={(type) => shanghaiThrow(2, sh2Nums, sh2Idx, setSh2Idx, sh2Dart, setSh2Dart, sh2Results, setSh2Results, sh2Score, setSh2Score, sh2Shanghais, setSh2Shanghais, type)}
        />
      )}
      {(phase === 2 && finished[2]) && <PhaseDone label="Shanghai 15-20" score={sh2Score} target={200} results={sh2Results} nums={sh2Nums} shanghais={sh2Shanghais} />}

      {/* Scoreboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", ...S.card, padding: 10 }}>
        {phaseLabels.map((p, i) => (
          <div key={i} style={S.stat}>
            <div style={S.statLabel}>{p.n}</div>
            <div style={S.statVal(p.score >= p.target ? "#16a34a" : "#374151")}>{p.score}</div>
            <div style={{ fontSize: 9, color: "#d1d5db" }}>/{p.target}</div>
          </div>
        ))}
        <div style={{ ...S.stat, borderLeft: "1px solid #e5e7eb" }}>
          <div style={S.statLabel}>TOTAL</div>
          <div style={S.statVal(total >= 400 ? "#7c3aed" : "#374151")}>{total}</div>
          <div style={{ fontSize: 9, color: "#d1d5db" }}>{total >= 400 ? "PASS" : `/${400}`}</div>
        </div>
      </div>

      <button onClick={resetAll} style={{ ...S.btn("#fee2e2"), color: "#dc2626" }}>Reset Session</button>
    </div>
  );
}

/* Shanghai dart-by-dart flow */
function ShanghaiFlow({ label, nums, idx, dart, results, score, target, shanghais, onThrow }) {
  const num = nums[idx];
  const existing = results[num] || { darts: [], score: 0 };

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>{label}</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: score >= target ? "#16a34a" : "#7c3aed" }}>{score} pts</span>
      </div>

      {/* Number progress dots */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
        {nums.map((n, i) => {
          const done = i < idx;
          const active = i === idx;
          const hasSh = results[n] && results[n].shanghai;
          return (
            <div key={n} style={{
              width: 36, height: 36, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
              background: hasSh ? "#facc15" : done ? "#7c3aed" : active ? "#fff" : "#f3f4f6",
              color: hasSh ? "#713f12" : done ? "#fff" : active ? "#7c3aed" : "#9ca3af",
              fontWeight: 800, fontSize: 13,
              border: active ? "3px solid #7c3aed" : "2px solid transparent",
              boxShadow: active ? "0 0 0 3px rgba(124,58,237,0.2)" : "none"
            }}>{n}</div>
          );
        })}
      </div>

      {/* Current number - BIG */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>NOW THROWING AT</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#7c3aed", lineHeight: 1 }}>{num}'s</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Dart {dart + 1} of 3</div>
      </div>

      {/* Dart slots for this number */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
        {[0, 1, 2].map(i => {
          const thrown = i < existing.darts.length;
          const active = i === dart;
          const d = existing.darts[i];
          const dColor = d === "X" ? "#dc2626" : d === "T" ? "#7c3aed" : d === "D" ? "#2563eb" : "#059669";
          const dLabel = d === "S" ? `${num}` : d === "D" ? `D${num}` : d === "T" ? `T${num}` : "Miss";
          return (
            <div key={i} style={{
              width: 80, height: 70, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: active ? "3px dashed #eab308" : thrown ? `3px solid ${dColor}` : "2px solid #d1d5db",
              background: thrown ? (d === "X" ? "#fef2f2" : "#f0fdf4") : active ? "#fefce8" : "#f9fafb"
            }}>
              {thrown ? (<><span style={{ fontSize: 18, fontWeight: 800, color: dColor }}>{dLabel}</span></>) : (
                <span style={{ fontSize: 24, color: active ? "#eab308" : "#d1d5db" }}>{active ? "?" : ""}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Throw buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => onThrow("S")} style={{ ...S.bigBtn("#059669"), padding: "22px 0", fontSize: 18 }}>
          Single {num}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{num} pts</span>
        </button>
        <button onClick={() => onThrow("D")} style={{ ...S.bigBtn("#2563eb"), padding: "22px 0", fontSize: 18 }}>
          Double {num}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{num * 2} pts</span>
        </button>
        <button onClick={() => onThrow("T")} style={{ ...S.bigBtn("#7c3aed"), padding: "22px 0", fontSize: 18 }}>
          Treble {num}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{num * 3} pts</span>
        </button>
        <button onClick={() => onThrow("X")} style={{ ...S.bigBtn("#dc2626"), padding: "22px 0", fontSize: 18 }}>
          Miss<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>0 pts</span>
        </button>
      </div>

      {shanghais > 0 && <div style={{ textAlign: "center", marginTop: 10, color: "#a16207", fontWeight: 800, fontSize: 14, background: "#fef9c3", padding: "6px 0", borderRadius: 10 }}>{shanghais} Shanghai{shanghais > 1 ? "s" : ""}! (+{shanghais * 100})</div>}
    </div>
  );
}

/* Doubles dart-by-dart flow */
function DoublesFlow({ nums, idx, results, score, onThrow }) {
  const current = nums[idx];
  const isB = current === "Bull";

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>Doubles Round the World</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#7c3aed" }}>{score} pts</span>
      </div>

      {/* Progress grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 12 }}>
        {nums.map((n, i) => {
          const done = i < idx;
          const active = i === idx;
          const hit = results[n] === true;
          const missed = results[n] === false;
          const lbl = n === "Bull" ? "B" : `${n}`;
          return (
            <div key={i} style={{
              padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 10, fontWeight: 700,
              background: hit ? "#22c55e" : missed ? "#fef2f2" : active ? "#fff" : "#f3f4f6",
              color: hit ? "#fff" : missed ? "#fca5a5" : active ? "#7c3aed" : "#9ca3af",
              border: active ? "2px solid #7c3aed" : "1px solid transparent",
              boxShadow: active ? "0 0 0 2px rgba(124,58,237,0.2)" : "none"
            }}>{hit ? "✓" : lbl}</div>
          );
        })}
      </div>

      {/* Current double - BIG */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>ONE DART AT</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: isB ? "#dc2626" : "#7c3aed", lineHeight: 1 }}>{isB ? "BULL" : `D${current}`}</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{isB ? "100 pts" : "50 pts"} if you hit</div>
      </div>

      {/* Hit / Miss */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button onClick={() => onThrow(true)} style={{ ...S.bigBtn("#22c55e"), padding: "36px 0", fontSize: 26 }}>
          HIT<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>+{isB ? 100 : 50} pts</span>
        </button>
        <button onClick={() => onThrow(false)} style={{ ...S.bigBtn("#ef4444"), padding: "36px 0", fontSize: 26 }}>
          MISS<span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>0 pts</span>
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
        {Object.values(results).filter(v => v === true).length} doubles hit so far
      </div>
    </div>
  );
}

/* Phase complete summary */
function PhaseDone({ label, score, target, results, nums, shanghais, isDoubles }) {
  return (
    <div style={{ ...S.card, background: score >= target ? "#f0fdf4" : "#f9fafb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: "#374151", fontSize: 14 }}>{label}</span>
        <span style={{ fontWeight: 800, fontSize: 16, color: score >= target ? "#16a34a" : "#dc2626" }}>{score} / {target} {score >= target ? "✓" : ""}</span>
      </div>
      {isDoubles ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {nums.map((n, i) => {
            const hit = results[n] === true;
            const lbl = n === "Bull" ? "B" : `D${n}`;
            return <div key={i} style={{ padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 10, fontWeight: 700, background: hit ? "#22c55e" : "#fee2e2", color: hit ? "#fff" : "#fca5a5" }}>{hit ? "✓" : lbl}</div>;
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {nums.map(n => {
            const r = results[n];
            if (!r) return null;
            return (
              <div key={n} style={{ padding: "4px 10px", borderRadius: 10, background: r.shanghai ? "#fef9c3" : "#f3e8ff", fontSize: 11, fontWeight: 700, color: r.shanghai ? "#92400e" : "#5b21b6" }}>
                {n}: {r.score}{r.shanghai ? " + SH" : ""}
              </div>
            );
          })}
        </div>
      )}
      {shanghais > 0 && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#a16207" }}>{shanghais} Shanghai{shanghais > 1 ? "s" : ""}!</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Phase complete ✓</div>
    </div>
  );
}

/* ═══════════════════════════════════
   HISTORY / PROGRESS
   ═══════════════════════════════════ */
function History({ data }) {
  const dayNames = ["1", "2", "3", "4", "5", "6", "7"];
  const weekAvg = (w, f) => { const v = w.filter(d => d).map(d => d[f]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const fmt = (v, dec = 0) => v !== null && v !== undefined ? (dec > 0 ? Number(v).toFixed(dec) : Math.round(v)) : "-";
  const trend = (vals) => { const f = vals.filter(v => v !== null); if (f.length < 2) return null; return f[f.length - 1] > f[0] ? "up" : f[f.length - 1] < f[0] ? "down" : "same"; };

  const MiniGrid = ({ title, color, weeks, renderCell, summaryRows }) => (
    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
      <div style={{ background: color, padding: "10px 14px" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{title}</span></div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            <th style={{ padding: "6px 6px", textAlign: "left", color: "#9ca3af", fontWeight: 600, width: 36 }}></th>
            {dayNames.map(d => <th key={d} style={{ padding: "6px 2px", textAlign: "center", color: "#9ca3af", fontWeight: 600, minWidth: 32 }}>{d}</th>)}
            <th style={{ padding: "6px 6px", textAlign: "center", color: "#6b7280", fontWeight: 700, minWidth: 40 }}>AVG</th>
          </tr></thead>
          <tbody>
            {[0, 1, 2, 3].map(wi => (
              <tr key={wi} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={{ padding: "5px 6px", fontWeight: 700, color: "#6b7280", fontSize: 11 }}>W{wi + 1}</td>
                {weeks[wi].map((d, di) => <td key={di} style={{ padding: "3px 1px", textAlign: "center" }}>{renderCell(d)}</td>)}
                <td style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#374151", background: "#f9fafb", fontSize: 12 }}>{summaryRows[wi] !== null ? summaryRows[wi] : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(() => { const t = trend(summaryRows); if (!t) return null; return (
        <div style={{ padding: "4px 14px 8px", textAlign: "right", fontSize: 12, fontWeight: 700, color: t === "up" ? "#16a34a" : t === "down" ? "#dc2626" : "#9ca3af" }}>
          {t === "up" ? "Improving ↑" : t === "down" ? "Declining ↓" : "Steady →"}
        </div>
      ); })()}
    </div>
  );

  const pill = (v, good) => ({ display: "inline-block", padding: "2px 5px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: v === null ? "transparent" : good ? "#ecfdf5" : "#f3f4f6", color: v === null ? "#d1d5db" : good ? "#059669" : "#374151" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#374151" }}>4-Week Progress</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>7 sessions per week</div>
      </div>
      <MiniGrid title="TONS — Points" color="#059669" weeks={data.tons}
        renderCell={d => <span style={pill(d, d && d.pts >= 21)}>{d ? d.pts : "-"}</span>}
        summaryRows={data.tons.map(w => { const a = weekAvg(w, "pts"); return a !== null ? fmt(a, 1) : null; })} />
      <MiniGrid title="TONS — Darts/Point" color="#059669" weeks={data.tons}
        renderCell={d => <span style={pill(d, d && d.pts > 0 && d.darts / d.pts < 10)}>{d && d.pts > 0 ? (d.darts / d.pts).toFixed(1) : "-"}</span>}
        summaryRows={data.tons.map(w => { const f = w.filter(d => d && d.pts > 0); if (!f.length) return null; return fmt(f.reduce((a, d) => a + d.darts / d.pts, 0) / f.length, 1); })} />
      <MiniGrid title="LADDER — Finishing Score" color="#2563eb" weeks={data.ladder}
        renderCell={d => <span style={pill(d, d && d.finish > d.start)}>{d ? d.finish : "-"}</span>}
        summaryRows={data.ladder.map(w => { const f = w.filter(d => d).map(d => d.finish); return f.length ? fmt(Math.max(...f)) : null; })} />
      <MiniGrid title="JDC — Total" color="#7c3aed" weeks={data.jdc}
        renderCell={d => <span style={pill(d, d && d.total >= 400)}>{d ? d.total : "-"}</span>}
        summaryRows={data.jdc.map(w => { const a = weekAvg(w, "total"); return a !== null ? fmt(a) : null; })} />
    </div>
  );
}

/* ═══════════════════════════════════
   APP
   ═══════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState("tons");
  const [wk, setWk] = useState(1);
  const [data, setData] = useState(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  const [screenOn, setScreenOn] = useState(false);

  // Wake Lock — keeps screen on at the board
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        setScreenOn(true);
        lock.addEventListener("release", () => { setScreenOn(false); setWakeLock(null); });
      }
    } catch (e) { console.log("Wake lock failed:", e); }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) { await wakeLock.release(); setWakeLock(null); setScreenOn(false); }
  };

  // Auto-request wake lock on mount, re-acquire when tab becomes visible again
  useEffect(() => {
    requestWakeLock();
    const handleVisibility = () => { if (document.visibilityState === "visible") requestWakeLock(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); releaseWakeLock(); };
  }, []);

  useEffect(() => { loadData().then(d => { setData(d); setLoaded(true); }); }, []);

  const nextSlot = (game) => { const w = data[game][wk - 1]; const s = w.findIndex(d => d === null); return s >= 0 ? s : -1; };

  const addSession = async (game, sessionData) => {
    const nd = JSON.parse(JSON.stringify(data));
    const wi = wk - 1;
    let slot = nd[game][wi].findIndex(d => d === null);
    if (slot === -1) {
      // Week full — roll forward
      nd[game][0] = nd[game][1]; nd[game][1] = nd[game][2]; nd[game][2] = nd[game][3]; nd[game][3] = emptyWeek();
      slot = 0; setWk(4);
      nd[game][3][0] = sessionData;
    } else {
      nd[game][wi][slot] = sessionData;
    }
    setData(nd);
    await saveData(nd);
  };

  const clearAll = async () => { const nd = emptyData(); setData(nd); await saveData(nd); };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading...</div>;

  const tabs = [
    { id: "tons", l: "Tons", bg: "#059669" },
    { id: "ladder", l: "Ladder", bg: "#2563eb" },
    { id: "jdc", l: "JDC", bg: "#7c3aed" },
    { id: "history", l: "Progress", bg: "#ea580c" },
  ];

  const slot = tab !== "history" ? nextSlot(tab) : -1;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#f3f4f6", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ background: "linear-gradient(135deg, #111827 0%, #1e293b 100%)", padding: "16px 0 0", textAlign: "center", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>🎯</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: 2, textTransform: "uppercase" }}>Darts Live Scorer</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1, letterSpacing: 1 }}>PRACTICE PLAN ONE</div>
          </div>
        </div>
        <button onClick={() => screenOn ? releaseWakeLock() : requestWakeLock()} style={{
          position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 99, border: "none",
          background: screenOn ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)",
          color: screenOn ? "#4ade80" : "#6b7280",
          fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: screenOn ? "#4ade80" : "#6b7280" }}></span>
          {screenOn ? "Screen on" : "Screen off"}
        </button>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "10px 0" }}>
          {[1, 2, 3, 4].map(w => {
            const filled = data.tons[w - 1].filter(d => d !== null).length;
            return (
              <button key={w} onClick={() => setWk(w)} style={{
                padding: "6px 14px", borderRadius: 99, border: "none",
                background: wk === w ? "#fff" : "#374151", color: wk === w ? "#111827" : "#9ca3af",
                fontWeight: 700, fontSize: 12, cursor: "pointer", position: "relative"
              }}>
                Wk {w}
                {filled > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#22c55e", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 99, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{filled}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 10px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
            background: tab === t.id ? t.bg : "transparent", color: tab === t.id ? "#fff" : "#9ca3af",
            fontWeight: 700, fontSize: 13, cursor: "pointer"
          }}>{t.l}</button>
        ))}
      </div>

      {tab !== "history" && (
        <div style={{ padding: "8px 12px", textAlign: "center", fontSize: 12, color: "#6b7280", background: "#f9fafb" }}>
          Week {wk} &bull; Session {slot >= 0 ? `${slot + 1} of 7` : "FULL"}
        </div>
      )}

      <div style={{ padding: 12 }}>
        {tab === "tons" && <Tons onSave={d => addSession("tons", d)} />}
        {tab === "ladder" && <LadderUp week={wk} onSave={d => addSession("ladder", d)} />}
        {tab === "jdc" && <JDCGame onSave={d => addSession("jdc", d)} />}
        {tab === "history" && <History data={data} />}
      </div>

      {tab === "history" && (
        <div style={{ padding: "0 12px" }}>
          <button onClick={() => { if (confirm("Clear ALL saved data? Cannot be undone.")) clearAll(); }} style={{ ...S.btn("#fee2e2"), color: "#dc2626", marginTop: 8 }}>Clear All Data</button>
        </div>
      )}

      {/* Footer / Branding */}
      <div style={{ padding: "24px 12px 16px", textAlign: "center" }}>
        <div style={{ width: 40, height: 2, background: "#d1d5db", margin: "0 auto 12px", borderRadius: 99 }}></div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: 0.5 }}>Created by</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#374151", marginTop: 2, letterSpacing: 0.5 }}>Ryan Beasley</div>
        <div style={{ fontSize: 10, color: "#d1d5db", marginTop: 6 }}>🎯 v1.0</div>
      </div>
    </div>
  );
}
