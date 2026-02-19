"use client";

import { useEffect, useState } from "react";

import { Dartboard, DartType } from "@/components/darts/Dartboard";
import { GameShell } from "@/components/darts/GameShell";
import { S } from "@/components/darts/styles";
import { GameComponentProps, GameDefinition } from "@/games/types";

type ThrowType = "S" | "D" | "T" | "X";
type Visit = { d: ThrowType[]; score: number; ok: boolean };

function TonsInner({ onSave, autoThrow, onComplete }: { onSave: GameComponentProps["onSave"]; autoThrow: GameComponentProps["autoThrow"]; onComplete: () => void }) {
  const [cur, setCur] = useState<ThrowType[]>([]);
  const [log, setLog] = useState<Visit[]>([]);
  const [darts, setDarts] = useState(0);
  const [saved, setSaved] = useState(false);

  const vals: Record<ThrowType, number> = { S: 20, D: 40, T: 60, X: 0 };
  const color: Record<ThrowType, string> = { S: "#059669", D: "#2563eb", T: "#7c3aed", X: "#dc2626" };

  const tap = (type: ThrowType) => {
    const next = [...cur, type];
    if (next.length === 3) {
      const miss = next.includes("X");
      const score = miss ? 0 : next.reduce((s, d) => s + vals[d], 0);
      setLog([...log, { d: next, score, ok: !miss }]);
      setDarts(darts + 3);
      setCur([]);
      return;
    }
    setCur(next);
  };

  const undo = () => {
    if (cur.length > 0) {
      setCur(cur.slice(0, -1));
      return;
    }
    if (log.length > 0) {
      const last = log[log.length - 1];
      setLog(log.slice(0, -1));
      setDarts(darts - 3);
      setCur(last.d.slice(0, 2));
    }
  };

  const valid = log.filter((v) => v.ok);
  const c60 = valid.filter((v) => v.score >= 60 && v.score < 100).length;
  const c100 = valid.filter((v) => v.score >= 100 && v.score < 140).length;
  const c140 = valid.filter((v) => v.score >= 140).length;
  const pts = c60 + c100 * 2 + c140 * 3;
  const done = pts >= 21;

  useEffect(() => {
    if (done && !saved) {
      onSave({ c60, c100, c140, darts, pts });
      setSaved(true);
    }
  }, [done, saved, onSave, c60, c100, c140, darts, pts]);

  useEffect(() => {
    if (!autoThrow || autoThrow.game !== "tons") return;
    const h = autoThrow.hit;
    if (h.number !== 20) { tap("X"); return; }
    if (h.multiplier === 1) tap("S");
    else if (h.multiplier === 2) tap("D");
    else if (h.multiplier === 3) tap("T");
    else tap("X");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoThrow?.id]);

  if (saved) {
    return (
      <div style={{ ...S.darkCard, border: "2px solid #16a34a", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>SESSION COMPLETE</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>Target reached in {darts} darts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {[{ l: "60+", v: c60, c: "#10b981" }, { l: "100+", v: c100, c: "#60a5fa" }, { l: "140+", v: c140, c: "#a78bfa" }, { l: "Points", v: pts, c: "#e5e7eb" }].map((st) => (
            <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
              <div style={{ fontSize: 18, color: st.c, fontWeight: 900 }}>{st.v}</div>
            </div>
          ))}
        </div>
        <button onClick={onComplete} style={{ ...S.darkBtn("#16a34a", 16), marginTop: 14, padding: "14px 0" }}>Done</button>
      </div>
    );
  }

  return (
    <>
      <div style={S.darkCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>TONS MODE</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{pts} / 21</div>
          </div>
          <div style={{ background: "#1f2937", color: "#9ca3af", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800 }}>
            Visit {log.length + 1}
          </div>
        </div>

        <Dartboard highlight={[20]} darts={cur.map(t => ({ type: t as DartType, color: color[t] }))} />

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[{ l: "60+", v: c60, c: "#10b981" }, { l: "100+", v: c100, c: "#60a5fa" }, { l: "140+", v: c140, c: "#a78bfa" }, { l: "Darts", v: darts, c: "#e5e7eb" }].map((st) => (
            <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
              <div style={{ fontSize: 18, color: st.c, fontWeight: 900 }}>{st.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { k: "S", lbl: "Single 20", sub: "20 pts", bg: "#059669" },
          { k: "D", lbl: "Double 20", sub: "40 pts", bg: "#2563eb" },
          { k: "T", lbl: "Treble 20", sub: "60 pts", bg: "#7c3aed" },
          { k: "X", lbl: "Miss", sub: "0 pts", bg: "#dc2626" },
        ].map((b) => (
          <button key={b.k} onClick={() => tap(b.k as ThrowType)} style={{ border: "none", borderRadius: 14, background: b.bg, color: "#fff", minHeight: 82, fontSize: 18, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: "pointer" }}>
            {b.lbl}
            <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>{b.sub}</span>
          </button>
        ))}
      </div>

      {(cur.length > 0 || log.length > 0) && (
        <button onClick={undo} style={{ ...S.darkBtn("rgba(255,255,255,0.08)"), color: "#9ca3af", fontSize: 13 }}>
          Undo last dart
        </button>
      )}
    </>
  );
}

function TonsGame({ onSave, autoThrow, gameHistory = [], onGameActiveChange, onExit, cameraSettings }: GameComponentProps) {
  const history = gameHistory as Array<{ pts?: number; darts?: number }>;
  const sessions = history.length;
  const avgPts = sessions > 0 ? history.reduce((a, s) => a + (typeof s.pts === "number" ? s.pts : 0), 0) / sessions : 0;
  const bestPts = sessions > 0 ? Math.max(...history.map((s) => (typeof s.pts === "number" ? s.pts : 0))) : 0;
  const dppValues = history
    .map((s) => (typeof s.pts === "number" && typeof s.darts === "number" && s.pts > 0 ? s.darts / s.pts : null))
    .filter((v): v is number => v !== null);
  const avgDpp = dppValues.length > 0 ? dppValues.reduce((a, b) => a + b, 0) / dppValues.length : 0;

  return (
    <GameShell
      title="Tons"
      rules={<>
        <div><b>Goal:</b> Reach 21 points.</div>
        <div><b>Rule:</b> All 3 darts must land in 20s, else visit scores 0.</div>
        <div><b>Scoring:</b> 60+ = 1pt, 100+ = 2pt, 140+ = 3pt.</div>
      </>}
      stats={[
        { label: "Sessions", value: String(sessions) },
        { label: "Avg Points", value: avgPts.toFixed(1) },
        { label: "Best Points", value: String(bestPts) },
        { label: "Avg Darts/Pt", value: avgDpp > 0 ? avgDpp.toFixed(2) : "-" },
      ]}
      startColor="#16a34a"
      cameraSettings={cameraSettings}
      onGameActiveChange={onGameActiveChange}
      onExit={onExit}
    >
      {(onComplete) => (
        <TonsInner onSave={onSave} autoThrow={autoThrow} onComplete={onComplete} />
      )}
    </GameShell>
  );
}

export const tonsGame: GameDefinition = {
  id: "tons",
  label: "Tons",
  tabColor: "#059669",
  Component: TonsGame,
};
