"use client";

import { useState } from "react";

export function Rules({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "linear-gradient(180deg,#0f172a 0%,#111827 100%)", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontWeight: 700, color: "#d1d5db", fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 18, color: "#6b7280" }}>{open ? "-" : "+"}</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px", fontSize: 13, lineHeight: 1.6, color: "#9ca3af" }}>{children}</div>}
    </div>
  );
}
