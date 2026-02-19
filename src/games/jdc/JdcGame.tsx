"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";

import { Dartboard, DartType } from "@/components/darts/Dartboard";
import { GameShell } from "@/components/darts/GameShell";
import { S } from "@/components/darts/styles";
import { GameComponentProps, GameDefinition } from "@/games/types";

const DART_COLORS: Record<string, string> = { S: "#059669", D: "#2563eb", T: "#7c3aed", X: "#dc2626" };

function ShanghaiFlow({ label, nums, idx, dart, results, score, target, shanghais, onThrow }: { label: string; nums: number[]; idx: number; dart: number; results: any; score: number; target: number; shanghais: number; onThrow: (type: string) => void }) {
  const num = nums[idx];
  const existing = results[num] || { darts: [], score: 0 };

  return (
    <div style={S.darkCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>{label}</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: score >= target ? "#4ade80" : "#a78bfa" }}>{score} pts</span>
      </div>

      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
        {nums.map((n, i) => {
          const done = i < idx;
          const active = i === idx;
          const hasSh = results[n] && results[n].shanghai;
          return (
            <div key={n} style={{
              width: 36, height: 36, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
              background: hasSh ? "#facc15" : done ? "#7c3aed" : active ? "transparent" : "#1f2937",
              color: hasSh ? "#713f12" : done ? "#fff" : active ? "#a78bfa" : "#6b7280",
              fontWeight: 800, fontSize: 13,
              border: active ? "3px solid #a78bfa" : "2px solid transparent",
            }}>{n}</div>
          );
        })}
      </div>

      <Dartboard
        highlight={[num]}
        darts={existing.darts.map((d: string) => ({ type: d as DartType, color: DART_COLORS[d] || "#dc2626" }))}
      />
      <div style={{ textAlign: "center", marginTop: 2, marginBottom: 10, fontSize: 12, color: "#9ca3af" }}>Dart {dart + 1} of 3</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { k: "S", lbl: `Single ${num}`, sub: `${num} pts`, bg: "#059669" },
          { k: "D", lbl: `Double ${num}`, sub: `${num * 2} pts`, bg: "#2563eb" },
          { k: "T", lbl: `Treble ${num}`, sub: `${num * 3} pts`, bg: "#7c3aed" },
          { k: "X", lbl: "Miss", sub: "0 pts", bg: "#dc2626" },
        ].map((b) => (
          <button key={b.k} onClick={() => onThrow(b.k)} style={{ border: "none", borderRadius: 14, background: b.bg, color: "#fff", minHeight: 82, fontSize: 18, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: "pointer" }}>
            {b.lbl}
            <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>{b.sub}</span>
          </button>
        ))}
      </div>

      {shanghais > 0 && <div style={{ textAlign: "center", marginTop: 10, color: "#fbbf24", fontWeight: 800, fontSize: 14, background: "rgba(250,204,21,0.12)", padding: "6px 0", borderRadius: 10 }}>{shanghais} Shanghai{shanghais > 1 ? "s" : ""}! (+{shanghais * 100})</div>}
    </div>
  );
}

function DoublesFlow({ nums, idx, results, score, onThrow }: { nums: (number | string)[]; idx: number; results: any; score: number; onThrow: (hit: boolean) => void }) {
  const current = nums[idx];
  const isB = current === "Bull";

  return (
    <div style={S.darkCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>Doubles Round the World</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#a78bfa" }}>{score} pts</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
        {nums.map((n, i) => {
          const active = i === idx;
          const hit = results[String(n)] === true;
          const missed = results[String(n)] === false;
          const lbl = n === "Bull" ? "B" : `${n}`;
          return (
            <div key={i} style={{
              padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 10, fontWeight: 700,
              background: hit ? "#22c55e" : missed ? "#1f2937" : active ? "transparent" : "#1f2937",
              color: hit ? "#fff" : missed ? "#6b7280" : active ? "#a78bfa" : "#6b7280",
              border: active ? "2px solid #a78bfa" : "1px solid transparent",
            }}>{hit ? "\u2713" : lbl}</div>
          );
        })}
      </div>

      <Dartboard
        highlight={isB ? [] : [current as number]}
        highlightBull={isB}
        maxWidth={220}
      />
      <div style={{ textAlign: "center", marginTop: 2, marginBottom: 10, fontSize: 12, color: "#9ca3af" }}>
        {isB ? "100 pts" : "50 pts"} if you hit
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => onThrow(true)} style={{ border: "none", borderRadius: 14, background: "#22c55e", color: "#fff", minHeight: 100, fontSize: 26, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: "pointer" }}>
          HIT<span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>+{isB ? 100 : 50} pts</span>
        </button>
        <button onClick={() => onThrow(false)} style={{ border: "none", borderRadius: 14, background: "#ef4444", color: "#fff", minHeight: 100, fontSize: 26, fontWeight: 900, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, cursor: "pointer" }}>
          MISS<span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>0 pts</span>
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
        {Object.values(results).filter((v: any) => v === true).length} doubles hit so far
      </div>
    </div>
  );
}

function PhaseDone({ label, score, target, results, nums, shanghais, isDoubles }: { label: string; score: number; target: number; results: any; nums: (number | string)[]; shanghais?: number; isDoubles?: boolean }) {
  return (
    <div style={S.darkCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: "#d1d5db", fontSize: 14 }}>{label}</span>
        <span style={{ fontWeight: 800, fontSize: 16, color: score >= target ? "#4ade80" : "#f87171" }}>{score} / {target} {score >= target ? "\u2713" : ""}</span>
      </div>
      {isDoubles ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {nums.map((n, i) => {
            const hit = results[String(n)] === true;
            const lbl = n === "Bull" ? "B" : `D${n}`;
            return <div key={i} style={{ padding: "6px 0", borderRadius: 8, textAlign: "center", fontSize: 10, fontWeight: 700, background: hit ? "#22c55e" : "#1f2937", color: hit ? "#fff" : "#6b7280" }}>{hit ? "\u2713" : lbl}</div>;
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {nums.map(n => {
            const r = results[n];
            if (!r) return null;
            return (
              <div key={String(n)} style={{ padding: "4px 10px", borderRadius: 10, background: r.shanghai ? "rgba(250,204,21,0.15)" : "rgba(124,58,237,0.15)", fontSize: 11, fontWeight: 700, color: r.shanghai ? "#fbbf24" : "#a78bfa" }}>
                {String(n)}: {r.score}{r.shanghai ? " + SH" : ""}
              </div>
            );
          })}
        </div>
      )}
      {shanghais !== undefined && shanghais > 0 && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{shanghais} Shanghai{shanghais > 1 ? "s" : ""}!</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Phase complete \u2713</div>
    </div>
  );
}

function JdcInner({ onSave, autoThrow, onComplete }: { onSave: GameComponentProps["onSave"]; autoThrow: GameComponentProps["autoThrow"]; onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  const sh1Nums = [10, 11, 12, 13, 14, 15];
  const sh2Nums = [15, 16, 17, 18, 19, 20];
  const dblNums: (number | string)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, "Bull"];

  const [sh1Idx, setSh1Idx] = useState(0);
  const [sh1Dart, setSh1Dart] = useState(0);
  const [sh1Results, setSh1Results] = useState<any>({});
  const [sh1Score, setSh1Score] = useState(0);
  const [sh1Shanghais, setSh1Shanghais] = useState(0);

  const [dblIdx, setDblIdx] = useState(0);
  const [dblResults, setDblResults] = useState<any>({});
  const [dblScore, setDblScore] = useState(0);

  const [sh2Idx, setSh2Idx] = useState(0);
  const [sh2Dart, setSh2Dart] = useState(0);
  const [sh2Results, setSh2Results] = useState<any>({});
  const [sh2Score, setSh2Score] = useState(0);
  const [sh2Shanghais, setSh2Shanghais] = useState(0);

  const [finished, setFinished] = useState([false, false, false]);
  const [saved, setSaved] = useState(false);

  const total = sh1Score + dblScore + sh2Score;

  const markFinished = (pi: number) => { const f = [...finished]; f[pi] = true; setFinished(f); };

  const shanghaiThrow = (phaseIdx: number, nums: number[], idx: number, setIdx: (v: number) => void, dart: number, setDart: (v: number) => void, results: any, setResults: (v: any) => void, score: number, setScore: any, shanghais: number, setShanghais: (v: number) => void, type: string) => {
    const num = nums[idx];
    const key = num;
    const existing = results[key] || { darts: [], score: 0, types: new Set() };

    let dartScore = 0;
    if (type === "S") dartScore = num;
    else if (type === "D") dartScore = num * 2;
    else if (type === "T") dartScore = num * 3;

    const newDarts = [...existing.darts, type];
    const newTypes = new Set(existing.types);
    if (type !== "X") newTypes.add(type);
    const newScore = existing.score + dartScore;

    const updated = { ...results, [key]: { darts: newDarts, score: newScore, types: newTypes } };
    setResults(updated);
    setScore(score + dartScore);

    const nextDart = dart + 1;
    if (nextDart >= 3) {
      if (newTypes.has("S") && newTypes.has("D") && newTypes.has("T")) {
        setShanghais(shanghais + 1);
        setScore((s: number) => s + 100);
        updated[key].shanghai = true;
      }
      const nextIdx = idx + 1;
      if (nextIdx >= nums.length) {
        markFinished(phaseIdx);
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

  const doublesThrow = (hit: boolean) => {
    const num = dblNums[dblIdx];
    const pts = hit ? (num === "Bull" ? 100 : 50) : 0;
    setDblResults({ ...dblResults, [String(num)]: hit });
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

  useEffect(() => {
    if (allDone && !saved) {
      onSave({ sh1: sh1Score, dbl: dblScore, sh2: sh2Score, total });
      setSaved(true);
    }
  }, [allDone, saved, onSave, sh1Score, dblScore, sh2Score, total]);

  useEffect(() => {
    if (!autoThrow || autoThrow.game !== "jdc" || allDone) return;
    const h = autoThrow.hit;
    if (phase === 1) {
      const target = dblNums[dblIdx];
      const hit =
        (target === "Bull" && h.number === "Bull") ||
        (typeof target === "number" && h.number === target && h.multiplier === 2);
      doublesThrow(hit);
      return;
    }
    const nums = phase === 0 ? sh1Nums : sh2Nums;
    const idx = phase === 0 ? sh1Idx : sh2Idx;
    const target = nums[idx];
    let type = "X";
    if (h.number === target) {
      if (h.multiplier === 1) type = "S";
      else if (h.multiplier === 2) type = "D";
      else if (h.multiplier === 3) type = "T";
    }
    if (phase === 0) {
      shanghaiThrow(0, sh1Nums, sh1Idx, setSh1Idx, sh1Dart, setSh1Dart, sh1Results, setSh1Results, sh1Score, setSh1Score, sh1Shanghais, setSh1Shanghais, type);
    } else if (phase === 2) {
      shanghaiThrow(2, sh2Nums, sh2Idx, setSh2Idx, sh2Dart, setSh2Dart, sh2Results, setSh2Results, sh2Score, setSh2Score, sh2Shanghais, setSh2Shanghais, type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoThrow?.id]);

  const phaseLabels = [
    { n: "SH 10-15", done: finished[0], score: sh1Score, target: 100 },
    { n: "Doubles", done: finished[1], score: dblScore, target: 100 },
    { n: "SH 15-20", done: finished[2], score: sh2Score, target: 200 },
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 14, padding: 4 }}>
        {phaseLabels.map((p, i) => (
          <button key={i} onClick={() => setPhase(i)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10, border: "none",
            background: phase === i ? "#7c3aed" : "transparent", color: phase === i ? "#fff" : p.done ? "#22c55e" : "#6b7280",
            fontWeight: 700, fontSize: 11, cursor: "pointer", position: "relative"
          }}>
            {p.done && <span style={{ marginRight: 4 }}>{"\u2713"}</span>}{p.n}
          </button>
        ))}
      </div>

      <div style={{ background: "#1f2937", borderRadius: 99, height: 40, position: "relative", overflow: "hidden" }}>
        <div style={S.progress((total / 400) * 100, "#8b5cf6", total >= 400)}>
          {total > 20 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{total} / 400</span>}
        </div>
        {total <= 20 && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#6b7280", fontSize: 16 }}>{total} / 400</span>}
      </div>

      {saved && (
        <div style={{ ...S.darkCard, border: `2px solid ${total >= 400 ? "#7c3aed" : "#dc2626"}`, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: total >= 400 ? "#a78bfa" : "#f87171" }}>{total >= 400 ? "TARGET HIT" : "SESSION COMPLETE"}</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", marginTop: 8 }}>{total}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
            {[
              { l: "SH 10-15", v: String(sh1Score), c: sh1Score >= 100 ? "#4ade80" : "#e5e7eb" },
              { l: "Doubles", v: String(dblScore), c: dblScore >= 100 ? "#4ade80" : "#e5e7eb" },
              { l: "SH 15-20", v: String(sh2Score), c: sh2Score >= 200 ? "#4ade80" : "#e5e7eb" },
            ].map((st) => (
              <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
                <div style={{ fontSize: 20, color: st.c, fontWeight: 900 }}>{st.v}</div>
              </div>
            ))}
          </div>
          <button onClick={onComplete} style={{ ...S.darkBtn(total >= 400 ? "#7c3aed" : "#6b7280", 16), marginTop: 14, padding: "14px 0" }}>Done</button>
        </div>
      )}

      {(phase === 0 && !finished[0]) && (
        <ShanghaiFlow label="Shanghai 10-15" nums={sh1Nums} idx={sh1Idx} dart={sh1Dart} results={sh1Results} score={sh1Score} target={100} shanghais={sh1Shanghais}
          onThrow={(type: string) => shanghaiThrow(0, sh1Nums, sh1Idx, setSh1Idx, sh1Dart, setSh1Dart, sh1Results, setSh1Results, sh1Score, setSh1Score, sh1Shanghais, setSh1Shanghais, type)} />
      )}
      {(phase === 0 && finished[0]) && <PhaseDone label="Shanghai 10-15" score={sh1Score} target={100} results={sh1Results} nums={sh1Nums} shanghais={sh1Shanghais} />}

      {(phase === 1 && !finished[1]) && (
        <DoublesFlow nums={dblNums} idx={dblIdx} results={dblResults} score={dblScore} onThrow={doublesThrow} />
      )}
      {(phase === 1 && finished[1]) && <PhaseDone label="Doubles RTW" score={dblScore} target={100} results={dblResults} nums={dblNums} isDoubles />}

      {(phase === 2 && !finished[2]) && (
        <ShanghaiFlow label="Shanghai 15-20" nums={sh2Nums} idx={sh2Idx} dart={sh2Dart} results={sh2Results} score={sh2Score} target={200} shanghais={sh2Shanghais}
          onThrow={(type: string) => shanghaiThrow(2, sh2Nums, sh2Idx, setSh2Idx, sh2Dart, setSh2Dart, sh2Results, setSh2Results, sh2Score, setSh2Score, sh2Shanghais, setSh2Shanghais, type)} />
      )}
      {(phase === 2 && finished[2]) && <PhaseDone label="Shanghai 15-20" score={sh2Score} target={200} results={sh2Results} nums={sh2Nums} shanghais={sh2Shanghais} />}

      <div style={{ ...S.darkCard, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: 10 }}>
        {phaseLabels.map((p, i) => (
          <div key={i} style={S.stat}>
            <div style={S.statLabel}>{p.n}</div>
            <div style={S.statVal(p.score >= p.target ? "#4ade80" : "#e5e7eb")}>{p.score}</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>/{p.target}</div>
          </div>
        ))}
        <div style={{ ...S.stat, borderLeft: "1px solid #374151" }}>
          <div style={S.statLabel}>TOTAL</div>
          <div style={S.statVal(total >= 400 ? "#a78bfa" : "#e5e7eb")}>{total}</div>
          <div style={{ fontSize: 9, color: "#6b7280" }}>{total >= 400 ? "PASS" : `/${400}`}</div>
        </div>
      </div>
    </>
  );
}

function JdcGame({ onSave, autoThrow, gameHistory = [], onGameActiveChange, onExit, cameraSettings }: GameComponentProps) {
  const history = gameHistory as Array<{ total?: number }>;
  const sessions = history.length;
  const avgTotal = sessions > 0 ? history.reduce((a, s) => a + (typeof s.total === "number" ? s.total : 0), 0) / sessions : 0;
  const bestTotal = sessions > 0 ? Math.max(...history.map((s) => (typeof s.total === "number" ? s.total : 0))) : 0;
  const passRate = sessions > 0 ? Math.round(history.filter(s => typeof s.total === "number" && s.total >= 400).length / sessions * 100) : 0;

  return (
    <GameShell
      title="JDC Challenge"
      rules={<>
        <div><b>Goal:</b> Score 400+ total across three phases.</div>
        <div><b>Shanghai 10-15:</b> 3 darts at each number. S+D+T = Shanghai (+100).</div>
        <div><b>Doubles RTW:</b> 1 dart at each double. Hit = 50pts, Bull = 100pts.</div>
        <div><b>Shanghai 15-20:</b> Same as first but numbers 15-20.</div>
      </>}
      stats={[
        { label: "Sessions", value: String(sessions) },
        { label: "Avg Total", value: avgTotal > 0 ? avgTotal.toFixed(0) : "-" },
        { label: "Best Total", value: bestTotal > 0 ? String(bestTotal) : "-" },
        { label: "Pass Rate", value: passRate > 0 ? passRate + "%" : "-" },
      ]}
      startColor="#7c3aed"
      cameraSettings={cameraSettings}
      onGameActiveChange={onGameActiveChange}
      onExit={onExit}
    >
      {(onComplete) => (
        <JdcInner onSave={onSave} autoThrow={autoThrow} onComplete={onComplete} />
      )}
    </GameShell>
  );
}

export const jdcGame: GameDefinition = {
  id: "jdc",
  label: "JDC",
  tabColor: "#7c3aed",
  Component: JdcGame,
};
