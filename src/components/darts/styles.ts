import React from "react";

export const S = {
  card: { background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 12 } as React.CSSProperties,
  btn: (bg: string, sz = 14): React.CSSProperties => ({ padding: "12px 0", borderRadius: 14, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: sz, cursor: "pointer", width: "100%" }),
  bigBtn: (bg: string): React.CSSProperties => ({ padding: "28px 0", borderRadius: 20, border: "none", background: bg, color: "#fff", fontWeight: 800, fontSize: 20, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }),
  darkCard: { background: "linear-gradient(180deg,#0f172a 0%,#111827 100%)", borderRadius: 18, padding: 14, border: "1px solid #1f2937" } as React.CSSProperties,
  darkBtn: (bg: string, sz = 14): React.CSSProperties => ({ padding: "12px 0", borderRadius: 14, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: sz, cursor: "pointer", width: "100%" }),
  stat: { textAlign: "center" } as React.CSSProperties,
  statLabel: { fontSize: 10, color: "#9ca3af", fontWeight: 600 } as React.CSSProperties,
  statVal: (c = "#374151"): React.CSSProperties => ({ fontSize: 20, fontWeight: 800, color: c }),
  progress: (pct: number, bg: string, done: boolean): React.CSSProperties => ({ height: "100%", borderRadius: 99, transition: "width 0.3s", width: `${Math.min(100, pct)}%`, background: done ? "#16a34a" : bg, display: "flex", alignItems: "center", justifyContent: "center" }),
};
