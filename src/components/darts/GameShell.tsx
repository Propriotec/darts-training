"use client";

import { useEffect, useState } from "react";

import { CameraSettingsPanel } from "@/components/darts/camera/CameraSettingsPanel";
import { S } from "@/components/darts/styles";
import { CameraSettings } from "@/games/types";

type InputMode = "video" | "manual";

interface GameShellProps {
  title: string;
  rules: React.ReactNode;
  stats: Array<{ label: string; value: string }>;
  startColor: string;
  cameraSettings?: CameraSettings;
  onGameActiveChange?: (active: boolean) => void;
  onExit?: () => void;
  children: (onComplete: () => void) => React.ReactNode;
}

export function GameShell({
  title,
  rules,
  stats,
  startColor,
  cameraSettings,
  onGameActiveChange,
  onExit,
  children,
}: GameShellProps) {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<InputMode | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    onGameActiveChange?.(started && mode !== null);
  }, [started, mode, onGameActiveChange]);

  const handleExit = () => {
    setStarted(false);
    setMode(null);
    onExit?.();
  };

  const handleComplete = () => {
    setStarted(false);
    setMode(null);
  };

  const pickMode = (m: InputMode) => {
    setMode(m);
    if (m === "video" && cameraSettings) {
      cameraSettings.setEnabled(true);
      setShowSettings(true);
    }
  };

  // Pre-start: How to Play + Start
  if (!started) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={S.darkCard}>
          <div style={{ color: "#d1d5db", fontSize: 12, fontWeight: 700 }}>{title.toUpperCase()}</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 900, lineHeight: 1.1, marginTop: 2 }}>How To Play</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, color: "#d1d5db", fontSize: 13, lineHeight: 1.45 }}>
            {rules}
          </div>
        </div>

        <div style={{ ...S.darkCard, marginBottom: 0 }}>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 800, marginBottom: 10 }}>Previous Stats</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#e5e7eb" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setStarted(true)} style={{ ...S.darkBtn(startColor, 17), padding: "15px 0" }}>
          Start
        </button>
      </div>
    );
  }

  // Mode selection: Video or Manual
  if (mode === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 0" }}>
        <div style={{ textAlign: "center", color: "#fff", fontSize: 18, fontWeight: 900, letterSpacing: 0.8 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          How do you want to score?
        </div>

        <button
          onClick={() => pickMode("video")}
          style={{
            border: "1px solid #2563eb55",
            borderRadius: 16,
            padding: "24px 20px",
            cursor: "pointer",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            textAlign: "left",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#1e3a5f",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            🎥
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Video</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginTop: 2 }}>
              Camera auto-detects your throws
            </div>
          </div>
        </button>

        <button
          onClick={() => pickMode("manual")}
          style={{
            border: "1px solid #374151",
            borderRadius: 16,
            padding: "24px 20px",
            cursor: "pointer",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            textAlign: "left",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#1f2937",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            ✋
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Manual</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginTop: 2 }}>
              Tap buttons to enter your scores
            </div>
          </div>
        </button>

        <button
          onClick={() => { setStarted(false); }}
          style={{
            border: "none", background: "transparent", color: "#6b7280",
            fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer",
            marginTop: 4,
          }}
        >
          &larr; Back
        </button>
      </div>
    );
  }

  // Game active
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
        <button onClick={handleExit} style={{ border: "none", background: "rgba(255,255,255,0.08)", color: "#9ca3af", borderRadius: 10, fontSize: 12, fontWeight: 700, padding: "7px 12px", cursor: "pointer" }}>Exit</button>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: 1.2 }}>{title.toUpperCase()}</div>
        {cameraSettings ? (
          <button onClick={() => setShowSettings(true)} style={{ border: "none", background: "rgba(255,255,255,0.08)", color: "#9ca3af", borderRadius: 10, fontSize: 16, fontWeight: 700, padding: "5px 10px", cursor: "pointer" }}>&#9881;</button>
        ) : (
          <div style={{ width: 42 }} />
        )}
      </div>

      {children(handleComplete)}

      {showSettings && cameraSettings && (
        <CameraSettingsPanel settings={cameraSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
