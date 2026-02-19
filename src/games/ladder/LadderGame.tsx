"use client";

import { useEffect, useRef, useState } from "react";

import { Dartboard } from "@/components/darts/Dartboard";
import { GameShell } from "@/components/darts/GameShell";
import { S } from "@/components/darts/styles";
import { GameComponentProps, GameDefinition } from "@/games/types";
import { LADDER } from "@/lib/darts/types";

function LadderInner({ week, onSave, onComplete }: { week: number; onSave: GameComponentProps["onSave"]; onComplete: () => void }) {
  const start = LADDER[week] || 40;
  const [cur, setCur] = useState(start);
  const [hi, setHi] = useState(start);
  const [att, setAtt] = useState(0);
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState(1200);
  const [on, setOn] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);

  const go = () => {
    if (on) return;
    setOn(true);
    ref.current = setInterval(() => setTime(p => {
      if (p <= 1) { clearInterval(ref.current!); setOn(false); return 0; }
      return p - 1;
    }), 1000);
  };

  const pause = () => { clearInterval(ref.current!); setOn(false); };

  const doHit = () => {
    const n = cur + 2;
    setCur(n); setHi(Math.max(hi, n)); setAtt(att + 1); setHits(hits + 1);
    if (!on) go();
  };

  const doMiss = () => {
    setCur(Math.max(2, cur - 1)); setAtt(att + 1);
    if (!on) go();
  };

  const hitRate = att > 0 ? Math.round(hits / att * 100) : 0;

  useEffect(() => {
    if (time === 0 && !saved && att > 0) {
      onSave({ start, finish: cur, highest: hi, attempts: att, hits, hitRate });
      setSaved(true);
    }
  }, [time, saved, att, onSave, start, cur, hi, hits, hitRate]);

  const m = Math.floor(time / 60);
  const s = time % 60;

  if (saved) {
    return (
      <div style={{ ...S.darkCard, border: "2px solid #2563eb", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>SESSION COMPLETE</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>Time&apos;s up! Here are your results.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          {[
            { l: "Finish", v: String(cur), c: "#e5e7eb" },
            { l: "Highest", v: String(hi), c: "#60a5fa" },
            { l: "Hit Rate", v: hitRate + "%", c: hitRate >= 50 ? "#4ade80" : "#f87171" },
            { l: "Change", v: (cur >= start ? "+" : "") + (cur - start), c: cur >= start ? "#4ade80" : "#f87171" },
          ].map((st) => (
            <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
              <div style={{ fontSize: 20, color: st.c, fontWeight: 900 }}>{st.v}</div>
            </div>
          ))}
        </div>
        <button onClick={onComplete} style={{ ...S.darkBtn("#2563eb", 16), marginTop: 14, padding: "14px 0" }}>Done</button>
      </div>
    );
  }

  return (
    <>
      {/* Timer */}
      <div style={{ ...S.darkCard, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>TIME REMAINING</div>
        <div style={{ fontSize: 56, fontFamily: "monospace", fontWeight: 800, color: time === 0 ? "#dc2626" : time < 120 ? "#f97316" : "#fff" }}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
        <div style={{ marginTop: 12 }}>
          {!on && time > 0 && <button onClick={go} style={{ ...S.darkBtn("#22c55e"), padding: "8px 24px", width: "auto" }}>{time < 1200 ? "Resume" : "Start Timer"}</button>}
          {on && <button onClick={pause} style={{ ...S.darkBtn("#eab308"), padding: "8px 24px", width: "auto" }}>Pause</button>}
        </div>
      </div>

      {/* Checkout display */}
      <div style={{ ...S.darkCard, padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700 }}>CURRENT CHECKOUT</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", lineHeight: 1, marginTop: 8 }}>{cur}</div>

        <Dartboard
          highlight={cur === 50 ? [] : cur % 2 === 0 && cur <= 40 ? [cur / 2] : cur <= 20 ? [cur] : [20]}
          highlightBull={cur === 50}
          maxWidth={200}
        />

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4, fontSize: 13, color: "#9ca3af" }}>
          <span>Start: {start}</span><span>|</span><span>Best: <b style={{ color: "#60a5fa" }}>{hi}</b></span><span>|</span>
          <span style={{ color: cur >= start ? "#4ade80" : "#f87171", fontWeight: 700 }}>{cur >= start ? "+" : ""}{cur - start}</span>
        </div>
      </div>

      {/* HIT / MISS buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={doHit} disabled={time === 0} style={{ border: "none", borderRadius: 14, background: time === 0 ? "#374151" : "#22c55e", color: "#fff", minHeight: 100, fontSize: 28, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: time === 0 ? "default" : "pointer" }}>
          HIT<span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>checkout +2</span>
        </button>
        <button onClick={doMiss} disabled={time === 0} style={{ border: "none", borderRadius: 14, background: time === 0 ? "#374151" : "#ef4444", color: "#fff", minHeight: 100, fontSize: 28, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: time === 0 ? "default" : "pointer" }}>
          MISS<span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>failed -1</span>
        </button>
      </div>

    </>
  );
}

function LadderGame({ week, onSave, gameHistory = [], onGameActiveChange, onExit, cameraSettings }: GameComponentProps) {
  const start = LADDER[week] || 40;

  const history = gameHistory as Array<{ finish?: number; highest?: number; hitRate?: number }>;
  const sessions = history.length;
  const avgFinish = sessions > 0 ? history.reduce((a, s) => a + (typeof s.finish === "number" ? s.finish : 0), 0) / sessions : 0;
  const bestFinish = sessions > 0 ? Math.max(...history.map((s) => (typeof s.finish === "number" ? s.finish : 0))) : 0;
  const hitRates = history.map(s => (typeof s.hitRate === "number" ? s.hitRate : null)).filter((v): v is number => v !== null);
  const avgHitRate = hitRates.length > 0 ? hitRates.reduce((a, b) => a + b, 0) / hitRates.length : 0;

  return (
    <GameShell
      title="Ladder Up"
      rules={<>
        <div><b>Goal:</b> Get as high a checkout as possible in 20 minutes.</div>
        <div><b>Start:</b> {start} (Week {week}). 3 darts to hit the checkout.</div>
        <div><b>Hit</b> = move UP 2 · <b>Miss</b> = drop DOWN 1.</div>
        <div><b>Weekly starts:</b> W1=40, W2=50, W3=60, W4=70.</div>
      </>}
      stats={[
        { label: "Sessions", value: String(sessions) },
        { label: "Avg Finish", value: avgFinish > 0 ? avgFinish.toFixed(0) : "-" },
        { label: "Best Finish", value: bestFinish > 0 ? String(bestFinish) : "-" },
        { label: "Avg Hit %", value: avgHitRate > 0 ? avgHitRate.toFixed(0) + "%" : "-" },
      ]}
      startColor="#2563eb"
      cameraSettings={cameraSettings}
      onGameActiveChange={onGameActiveChange}
      onExit={onExit}
    >
      {(onComplete) => (
        <LadderInner week={week} onSave={onSave} onComplete={onComplete} />
      )}
    </GameShell>
  );
}

export const ladderGame: GameDefinition = {
  id: "ladder",
  label: "Ladder",
  tabColor: "#2563eb",
  Component: LadderGame,
};
