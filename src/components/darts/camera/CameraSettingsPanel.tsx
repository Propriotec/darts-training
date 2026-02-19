"use client";

import { useEffect, useRef } from "react";

import { CameraSettings } from "@/games/types";
import { BOARD_RINGS, DART_ORDER } from "@/lib/darts/scoring";

export function CameraSettingsPanel({
  settings,
  onClose,
}: {
  settings: CameraSettings;
  onClose: () => void;
}) {
  const { state, actions, refs, enabled, setEnabled } = settings;
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!state.cameraOn) return;
    let frame = 0;
    const draw = () => {
      const video = refs.videoRef.current;
      const canvas = previewRef.current;
      if (!video || !canvas) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = 320;
      const h = 240;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, w, h);
      } else {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, w, h);
      }

      const centerX = state.boardCenterX * w;
      const centerY = state.boardCenterY * h;
      const minDim = Math.min(w, h);
      const calib = state.boardCalib;

      if (calib && calib.rx > 0 && calib.ry > 0) {
        drawBoardOverlay(ctx, centerX, centerY, calib.rx * minDim, calib.ry * minDim, calib.angle, calib.rotation);
      } else {
        // Fallback circle overlay
        const r = state.boardRadius * minDim;
        drawBoardOverlay(ctx, centerX, centerY, r, r, 0, 0);
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [refs.videoRef, state.boardCenterX, state.boardCenterY, state.boardRadius, state.boardCalib, state.cameraOn]);

  const aspect = state.boardCalib
    ? Math.min(state.boardCalib.rx, state.boardCalib.ry) / Math.max(state.boardCalib.rx, state.boardCalib.ry)
    : 1;
  const tiltPct = Math.round((1 - aspect) * 100);
  const rotDeg = state.boardCalib ? Math.round((state.boardCalib.rotation * 180) / Math.PI) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "linear-gradient(180deg,#0f172a 0%,#111827 100%)",
          borderRadius: "20px 20px 0 0",
          padding: "16px 16px 28px",
          border: "1px solid #1f2937",
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>Camera Settings</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "#9ca3af",
              borderRadius: 10,
              width: 32,
              height: 32,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            x
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div
            style={{
              borderRadius: 10,
              padding: "5px 10px",
              background: state.cameraOn ? "#14532d" : "#3f3f46",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Camera {state.cameraOn ? "ON" : "OFF"}
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "6px 12px",
              background: enabled ? "#7f1d1d" : "#166534",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {enabled ? "Turn Camera Off" : "Turn Camera On"}
          </button>
          <button
            onClick={async () => {
              if (!state.cameraOn) {
                setEnabled(true);
                await actions.startCamera();
              }
              actions.autoCalibrate();
            }}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "6px 12px",
              background: "#2563eb",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Auto-Calibrate
          </button>
        </div>

        {state.cameraOn && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 8 }}>Calibration Preview</div>
            <canvas
              ref={previewRef}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #374151",
                background: "#111827",
                display: "block",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>Board Radius</label>
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>{state.boardRadius.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={0.48}
            step={0.01}
            value={state.boardRadius}
            onChange={(e) => actions.setBoardRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#2563eb" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>
            Center: {state.boardCenterX.toFixed(2)}, {state.boardCenterY.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textAlign: "center" }}>
            Tilt: {tiltPct > 0 ? `${tiltPct}%` : "None"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textAlign: "right" }}>
            Rot: {rotDeg !== 0 ? `${rotDeg > 0 ? "+" : ""}${rotDeg}\u00B0` : "0\u00B0"}
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: state.cameraError ? "#fca5a5" : "#9ca3af",
            fontWeight: 700,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          {state.cameraError || state.cameraStatus}
        </div>

        <div
          style={{
            fontSize: 11,
            color: state.cvReady ? "#4ade80" : "#fbbf24",
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          MediaPipe: {state.cvReady ? "Ready" : "Not loaded"}
        </div>
      </div>
    </div>
  );
}

/**
 * Draw the full board overlay: rings, segment lines, and segment numbers.
 * All drawn as ellipses to handle perspective distortion.
 */
function drawBoardOverlay(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
  ellipseAngle: number,
  boardRotation: number,
) {
  const cosE = Math.cos(ellipseAngle);
  const sinE = Math.sin(ellipseAngle);

  // Helper: get pixel position for a point at (angle on board, fraction of radius)
  const boardPoint = (boardAngleDeg: number, frac: number): [number, number] => {
    // Convert board angle (clockwise from top, with rotation) to math angle
    const adjustedDeg = boardAngleDeg + (boardRotation * 180) / Math.PI;
    const mathAngle = ((adjustedDeg - 90) * Math.PI) / 180;
    const ux = Math.cos(mathAngle);
    const uy = Math.sin(mathAngle);
    const ex = ux * rx * frac;
    const ey = uy * ry * frac;
    return [
      cx + ex * cosE - ey * sinE,
      cy + ex * sinE + ey * cosE,
    ];
  };

  // Helper: draw an ellipse ring at a fraction of the outer radius
  const drawRing = (frac: number, color: string, lineWidth: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * frac, ry * frac, ellipseAngle, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Draw rings using real dartboard proportions
  drawRing(BOARD_RINGS.doubleOuter, "rgba(16,185,129,0.9)", 2);      // Outer edge (green)
  drawRing(BOARD_RINGS.doubleInner, "rgba(16,185,129,0.6)", 1);      // Double inner
  drawRing(BOARD_RINGS.trebleOuter, "rgba(59,130,246,0.7)", 1.5);    // Treble outer (blue)
  drawRing(BOARD_RINGS.trebleInner, "rgba(59,130,246,0.7)", 1.5);    // Treble inner
  drawRing(BOARD_RINGS.singleBull, "rgba(239,68,68,0.7)", 1.5);      // Outer bull (red)
  drawRing(BOARD_RINGS.doubleBull, "rgba(239,68,68,0.9)", 1.5);      // Double bull

  // Draw 20 segment wire lines
  ctx.strokeStyle = "rgba(234,179,8,0.6)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    // Wire boundaries are at 9° + i*18° from the center of segment 20
    const wireDeg = 9 + i * 18;
    const [bx, by] = boardPoint(wireDeg, BOARD_RINGS.singleBull);
    const [ex, ey] = boardPoint(wireDeg, BOARD_RINGS.doubleOuter);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Draw segment numbers
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 20; i++) {
    const segCenterDeg = i * 18; // Center of segment in board coords
    const num = DART_ORDER[i];
    // Place number just outside the double ring
    const [nx, ny] = boardPoint(segCenterDeg, 1.08);

    // Highlight 20 in green, others in white
    ctx.fillStyle = num === 20 ? "rgba(16,185,129,1)" : "rgba(255,255,255,0.7)";
    ctx.fillText(String(num), nx, ny);
  }

  // Draw a marker at segment 20 center (top of board)
  const [t20x, t20y] = boardPoint(0, 1.0);
  ctx.fillStyle = "rgba(16,185,129,0.9)";
  ctx.beginPath();
  ctx.arc(t20x, t20y, 3, 0, Math.PI * 2);
  ctx.fill();
}
