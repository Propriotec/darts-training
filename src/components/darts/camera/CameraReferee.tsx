"use client";

import { useState } from "react";

import Image from "next/image";

import { useCameraEngine } from "@/components/darts/camera/useCameraEngine";
import { hitLabel } from "@/lib/darts/scoring";
import { AutoThrowEvent, DetectedHit, GameTab } from "@/lib/darts/types";

export function CameraReferee({
  activeGame,
  enabled,
  onThrow,
}: {
  activeGame: GameTab;
  enabled: boolean;
  onThrow: (event: AutoThrowEvent) => void;
}) {
  const [recent, setRecent] = useState<string[]>([]);
  const [entry, setEntry] = useState("");

  const { state, actions, refs } = useCameraEngine(activeGame, enabled, (event) => {
    setRecent((list) => [hitLabel(event.hit), ...list].slice(0, 3));
    onThrow(event);
  });

  const emitManualThrow = (hit: DetectedHit) => {
    setRecent((list) => [hitLabel(hit), ...list].slice(0, 3));
    onThrow({ id: Date.now(), game: activeGame, hit });
  };

  return (
    <div style={{ background: "linear-gradient(165deg, #111827 0%, #1f2937 58%, #0b1020 100%)", borderRadius: 18, border: "1px solid #374151", overflow: "hidden", marginBottom: 0, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 4px" }}>
        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>{activeGame.toUpperCase()} CAMERA</div>
        <div style={{ display: "flex", gap: 8 }}>
          {state.cameraOn && <button onClick={actions.autoCalibrate} style={{ border: "none", borderRadius: 10, padding: "5px 9px", background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 800 }}>CAL</button>}
          <div style={{ borderRadius: 10, padding: "5px 9px", background: state.cameraOn ? "#14532d" : "#3f3f46", color: "#fff", fontSize: 11, fontWeight: 800 }}>{state.cameraOn ? "ON" : "OFF"}</div>
        </div>
      </div>

      <div style={{ padding: "4px 10px 10px" }}>
        <div style={{ width: 282, height: 282, margin: "0 auto", borderRadius: "50%", border: "2px solid #374151", position: "relative", background: "#111827", overflow: "hidden" }}>
          <Image
            src="/dart-board.png"
            alt="Dartboard"
            fill
            sizes="282px"
            style={{ objectFit: "cover" }}
            priority
          />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08)" }} />
        </div>

        <div style={{ marginTop: 8, color: "#d1d5db", fontSize: 12, lineHeight: 1.5 }}>
          {recent.length > 0 ? recent.join("\n") : "No throws yet"}
        </div>

        {/* Number pad for Ladder/JDC */}
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: 2 }}>
          <div style={{ gridColumn: "1 / span 3", border: "1px solid #6b7280", borderRadius: 10, color: "#e5e7eb", fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 56 }}>{entry || "\u2014"}</div>
          <button onClick={() => setEntry("")} style={{ border: "none", borderRadius: 10, background: "#7f1d1d", color: "#fff", fontSize: 24, fontWeight: 800, minHeight: 56 }}>CLEAR</button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
            <button key={n} onClick={() => setEntry((v) => `${v}${n}`.slice(0, 3))} style={{ border: "1px solid #6b7280", borderRadius: 8, background: "#d1d5db", color: "#111827", minHeight: 46, fontSize: 26, fontWeight: 700 }}>
              {n}
            </button>
          ))}
          <button
            onClick={() => {
              if (!entry) return;
              const num = parseInt(entry, 10);
              if (!isNaN(num)) {
                emitManualThrow({ number: num, multiplier: 1, confidence: 1 });
              }
              setEntry("");
            }}
            style={{ gridColumn: "4", gridRow: "2 / span 3", border: "none", borderRadius: 10, background: "#166534", color: "#fff", fontSize: 34, fontWeight: 800 }}
          >
            OK
          </button>
        </div>

        <div style={{ marginTop: 6, fontSize: 10, color: state.cameraError ? "#fca5a5" : "#9ca3af", fontWeight: 700 }}>{state.cameraError || state.cameraStatus}</div>
      </div>

      <video ref={refs.videoRef} muted playsInline style={{ width: 1, height: 1, opacity: 0, position: "absolute", pointerEvents: "none" }} />
      <canvas ref={refs.canvasRef} style={{ display: "none" }} />
    </div>
  );
}
