"use client";

import { useEffect, useState } from "react";

import { Dartboard } from "@/components/darts/Dartboard";
import { GameShell } from "@/components/darts/GameShell";
import { S } from "@/components/darts/styles";
import { GameComponentProps, GameDefinition } from "@/games/types";

type TargetType = "any" | "singles" | "doubles" | "trebles";
type DartsPerNumber = 1 | 3;
type AdvanceMode = "always" | "must-hit";

const TARGET_LABELS: Record<TargetType, string> = {
  any: "Any",
  singles: "Singles",
  doubles: "Doubles",
  trebles: "Trebles",
};

const TARGET_COLORS: Record<TargetType, string> = {
  any: "#6366f1",
  singles: "#059669",
  doubles: "#2563eb",
  trebles: "#7c3aed",
};

function AtcInner({
  onSave,
  autoThrow,
  onComplete,
}: {
  onSave: GameComponentProps["onSave"];
  autoThrow: GameComponentProps["autoThrow"];
  onComplete: () => void;
}) {
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [dartsPerNumber, setDartsPerNumber] = useState<DartsPerNumber | null>(null);
  const [advanceMode, setAdvanceMode] = useState<AdvanceMode | null>(null);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [dartIndex, setDartIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [totalDarts, setTotalDarts] = useState(0);
  const [saved, setSaved] = useState(false);
  // Each entry is one round of darts; advanced = whether we moved to next number
  const [roundLog, setRoundLog] = useState<Array<{ hits: number; advanced: boolean; number: number }>>([]);
  const [currentDarts, setCurrentDarts] = useState<Array<"hit" | "miss">>([]);

  const dpn = dartsPerNumber ?? 3;
  const mustHit = advanceMode === "must-hit";
  const done = currentNumber > 20;

  useEffect(() => {
    if (done && !saved && targetType && dartsPerNumber && advanceMode) {
      onSave({ hits, darts: totalDarts, targetType, dartsPerNumber, advanceMode });
      setSaved(true);
    }
  }, [done, saved, onSave, hits, totalDarts, targetType, dartsPerNumber, advanceMode]);

  useEffect(() => {
    if (!autoThrow || autoThrow.game !== "atc" || !targetType || !dartsPerNumber || !advanceMode || done) return;
    const h = autoThrow.hit;
    if (h.number !== currentNumber) {
      recordDart("miss");
      return;
    }
    const isHit =
      targetType === "any" ||
      (targetType === "singles" && h.multiplier === 1) ||
      (targetType === "doubles" && h.multiplier === 2) ||
      (targetType === "trebles" && h.multiplier === 3);
    recordDart(isHit ? "hit" : "miss");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoThrow?.id]);

  const recordDart = (result: "hit" | "miss") => {
    const newDarts = [...currentDarts, result];
    const newTotalDarts = totalDarts + 1;
    const newHits = result === "hit" ? hits + 1 : hits;

    if (newDarts.length === dpn) {
      const roundHits = newDarts.filter((d) => d === "hit").length;
      const advance = !mustHit || roundHits > 0;
      setRoundLog([...roundLog, { hits: roundHits, advanced: advance, number: currentNumber }]);
      setCurrentDarts([]);
      setDartIndex(0);
      if (advance) setCurrentNumber(currentNumber + 1);
    } else {
      setCurrentDarts(newDarts);
      setDartIndex(newDarts.length);
    }

    setTotalDarts(newTotalDarts);
    setHits(newHits);
  };

  const undo = () => {
    if (currentDarts.length > 0) {
      const lastDart = currentDarts[currentDarts.length - 1];
      setCurrentDarts(currentDarts.slice(0, -1));
      setDartIndex(currentDarts.length - 1);
      setTotalDarts(totalDarts - 1);
      if (lastDart === "hit") setHits(hits - 1);
    } else if (roundLog.length > 0) {
      const lastEntry = roundLog[roundLog.length - 1];
      setRoundLog(roundLog.slice(0, -1));
      if (lastEntry.advanced) setCurrentNumber(currentNumber - 1);
      const restored: Array<"hit" | "miss"> = [
        ...Array(lastEntry.hits).fill("hit"),
        ...Array(dpn - lastEntry.hits).fill("miss"),
      ];
      const lastDart = restored[restored.length - 1];
      setCurrentDarts(restored.slice(0, -1));
      setDartIndex(dpn - 1);
      setTotalDarts(totalDarts - 1);
      if (lastDart === "hit") setHits(hits - 1);
    }
  };

  // Config picker - step 1: target type
  if (targetType === null) {
    return (
      <div style={S.darkCard}>
        <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>CONFIGURE</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
          Target Type
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          Which segments count as a hit?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["any", "singles", "doubles", "trebles"] as TargetType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTargetType(t)}
              style={{
                border: "none",
                borderRadius: 14,
                background: TARGET_COLORS[t],
                color: "#fff",
                minHeight: 64,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
              }}
            >
              {TARGET_LABELS[t]}
              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
                {t === "any" ? "S / D / T" : t === "singles" ? "Single only" : t === "doubles" ? "Double only" : "Treble only"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Config picker - step 2: darts per number
  if (dartsPerNumber === null) {
    return (
      <div style={S.darkCard}>
        <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>CONFIGURE</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
          Darts Per Number
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          How many darts at each number?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([1, 3] as DartsPerNumber[]).map((n) => (
            <button
              key={n}
              onClick={() => setDartsPerNumber(n)}
              style={{
                border: "none",
                borderRadius: 14,
                background: n === 1 ? "#0ea5e9" : "#6366f1",
                color: "#fff",
                minHeight: 64,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
              }}
            >
              {n} Dart{n > 1 ? "s" : ""}
              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
                {n === 1 ? "Quick round (20 darts)" : "Full round (60 darts)"}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setTargetType(null)}
          style={{ border: "none", background: "transparent", color: "#6b7280", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer", marginTop: 8, width: "100%" }}
        >
          &larr; Back
        </button>
      </div>
    );
  }

  // Config picker - step 3: advance mode
  if (advanceMode === null) {
    return (
      <div style={S.darkCard}>
        <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>CONFIGURE</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
          Advance Rule
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          When do you move to the next number?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => setAdvanceMode("always")}
            style={{
              border: "none",
              borderRadius: 14,
              background: "#0ea5e9",
              color: "#fff",
              minHeight: 64,
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            Always
            <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Advance after darts</span>
          </button>
          <button
            onClick={() => setAdvanceMode("must-hit")}
            style={{
              border: "none",
              borderRadius: 14,
              background: "#d97706",
              color: "#fff",
              minHeight: 64,
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            Must Hit
            <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Stay until you hit</span>
          </button>
        </div>
        <button
          onClick={() => setDartsPerNumber(null)}
          style={{ border: "none", background: "transparent", color: "#6b7280", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer", marginTop: 8, width: "100%" }}
        >
          &larr; Back
        </button>
      </div>
    );
  }

  // Complete screen
  if (saved) {
    const pct = totalDarts > 0 ? Math.round((hits / totalDarts) * 100) : 0;
    return (
      <div style={{ ...S.darkCard, border: "2px solid #16a34a", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>SESSION COMPLETE</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>
          {TARGET_LABELS[targetType]} &middot; {dpn} dart{dpn > 1 ? "s" : ""} &middot; {mustHit ? "Must Hit" : "Always Advance"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {[
            { l: "Hits", v: hits, c: "#10b981" },
            { l: "Darts", v: totalDarts, c: "#60a5fa" },
            { l: "Accuracy", v: `${pct}%`, c: "#e5e7eb" },
          ].map((st) => (
            <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
              <div style={{ fontSize: 18, color: st.c, fontWeight: 900 }}>{st.v}</div>
            </div>
          ))}
        </div>
        <button onClick={onComplete} style={{ ...S.darkBtn("#16a34a", 16), marginTop: 14, padding: "14px 0" }}>
          Done
        </button>
      </div>
    );
  }

  // Gameplay
  const progress = ((currentNumber - 1) / 20) * 100;

  return (
    <>
      <div style={S.darkCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>
              ATC &middot; {TARGET_LABELS[targetType]}
            </div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
              {currentNumber > 20 ? "Done" : currentNumber}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: "#1f2937", color: "#9ca3af", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800 }}>
              Dart {dartIndex + 1} / {dpn}
            </div>
          </div>
        </div>

        <Dartboard highlight={currentNumber <= 20 ? [currentNumber] : []} />

        {/* Progress bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", fontWeight: 700, marginBottom: 4 }}>
            <span>Progress</span>
            <span>{currentNumber > 20 ? 20 : currentNumber - 1} / 20</span>
          </div>
          <div style={{ height: 8, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${progress}%`, background: TARGET_COLORS[targetType], transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { l: "Hits", v: hits, c: "#10b981" },
            { l: "Darts", v: totalDarts, c: "#e5e7eb" },
            { l: "Hit %", v: totalDarts > 0 ? `${Math.round((hits / totalDarts) * 100)}%` : "-", c: "#60a5fa" },
          ].map((st) => (
            <div key={st.l} style={{ borderRadius: 10, background: "#0b1220", border: "1px solid #1f2937", padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{st.l}</div>
              <div style={{ fontSize: 18, color: st.c, fontWeight: 900 }}>{st.v}</div>
            </div>
          ))}
        </div>

        {/* Dart indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
          {Array.from({ length: dpn }, (_, i) => i).map((i) => {
            const dart = currentDarts[i];
            const isCurrent = i === dartIndex;
            let bg = "#1f2937";
            let border = "2px solid #374151";
            if (dart === "hit") { bg = "#059669"; border = "2px solid #10b981"; }
            else if (dart === "miss") { bg = "#dc2626"; border = "2px solid #ef4444"; }
            else if (isCurrent) { border = "2px solid #6366f1"; }
            return (
              <div key={i} style={{ width: 32, height: 32, borderRadius: 999, background: bg, border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
                {dart === "hit" ? "\u2713" : dart === "miss" ? "\u2717" : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hit / Miss buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          onClick={() => recordDart("hit")}
          style={{
            border: "none",
            borderRadius: 14,
            background: "#059669",
            color: "#fff",
            minHeight: 82,
            fontSize: 18,
            fontWeight: 900,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
          }}
        >
          Hit
          <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>+1 point</span>
        </button>
        <button
          onClick={() => recordDart("miss")}
          style={{
            border: "none",
            borderRadius: 14,
            background: "#dc2626",
            color: "#fff",
            minHeight: 82,
            fontSize: 18,
            fontWeight: 900,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
          }}
        >
          Miss
          <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>0 points</span>
        </button>
      </div>

      {(currentDarts.length > 0 || roundLog.length > 0) && (
        <button onClick={undo} style={{ ...S.darkBtn("rgba(255,255,255,0.08)"), color: "#9ca3af", fontSize: 13 }}>
          Undo last dart
        </button>
      )}
    </>
  );
}

function AroundTheClockGame({
  onSave,
  autoThrow,
  gameHistory = [],
  onGameActiveChange,
  onExit,
  cameraSettings,
}: GameComponentProps) {
  const history = gameHistory as Array<{ hits?: number; darts?: number }>;
  const sessions = history.length;
  const totalHits = history.reduce((a, s) => a + (typeof s.hits === "number" ? s.hits : 0), 0);
  const totalThrown = history.reduce((a, s) => a + (typeof s.darts === "number" ? s.darts : 0), 0);
  const accuracy = totalThrown > 0 ? Math.round((totalHits / totalThrown) * 100) : 0;

  return (
    <GameShell
      title="Around the Clock"
      rules={
        <>
          <div><b>Goal:</b> Hit every number 1 through 20.</div>
          <div><b>Rule:</b> Throw 1 or 3 darts at each number. Advance always, or only when you hit.</div>
          <div><b>Scoring:</b> 1 point per hit.</div>
        </>
      }
      stats={[
        { label: "Sessions", value: String(sessions) },
        { label: "Total Hits", value: String(totalHits) },
        { label: "Accuracy", value: sessions > 0 ? `${accuracy}%` : "-" },
      ]}
      startColor="#6366f1"
      cameraSettings={cameraSettings}
      onGameActiveChange={onGameActiveChange}
      onExit={onExit}
    >
      {(onComplete) => (
        <AtcInner onSave={onSave} autoThrow={autoThrow} onComplete={onComplete} />
      )}
    </GameShell>
  );
}

export const atcGame: GameDefinition = {
  id: "atc",
  label: "Around the Clock",
  tabColor: "#6366f1",
  Component: AroundTheClockGame,
};
