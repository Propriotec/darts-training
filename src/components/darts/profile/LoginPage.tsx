"use client";

import { useState } from "react";

import { UserProfile } from "@/lib/darts/types";

const avatarColor = (name: string) => {
  const palette = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[seed % palette.length];
};

export function LoginPage({
  users,
  onSelect,
  onCreate,
}: {
  users: UserProfile[];
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(circle at top, #1f2937 0%, #111827 55%, #030712 100%)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 18px 32px" }}>
      <div style={{ marginTop: 22, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>Darts Live</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Who&apos;s training today?</div>
      </div>

      <div style={{ marginTop: 38, width: "100%", maxWidth: 360, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div style={{ width: 108, height: 108, borderRadius: "50%", background: avatarColor(u.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 900, border: "3px solid rgba(255,255,255,0.35)", boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
              {u.name.trim().charAt(0).toUpperCase() || "P"}
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>{u.name}</div>
          </button>
        ))}

        <button
          onClick={() => setAdding(v => !v)}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <div style={{ width: 108, height: 108, borderRadius: "50%", border: "3px dashed #4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 300 }}>
            +
          </div>
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>Add Profile</div>
        </button>
      </div>

      {adding && (
        <div style={{ marginTop: 24, width: "100%", maxWidth: 360, background: "rgba(17,24,39,0.8)", border: "1px solid #374151", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, fontWeight: 700 }}>Create Profile</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              style={{ borderRadius: 10, border: "1px solid #4b5563", background: "#111827", color: "#fff", fontSize: 14, padding: "10px 12px" }}
            />
            <button
              onClick={() => {
                const n = name.trim();
                if (!n) return;
                onCreate(n);
                setName("");
                setAdding(false);
              }}
              style={{ border: "none", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 800, fontSize: 13, padding: "0 14px" }}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
