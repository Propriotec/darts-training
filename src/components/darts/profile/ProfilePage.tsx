"use client";

import { S } from "@/components/darts/styles";
import { UserProfile } from "@/lib/darts/types";
import { useState } from "react";

export function ProfilePage({
  users,
  activeUser,
  onSwitchUser,
  onCreateUser,
  onRenameActive,
  onDeleteActive,
  onClearActiveData,
  onLogout,
}: {
  users: UserProfile[];
  activeUser: UserProfile;
  onSwitchUser: (id: string) => void;
  onCreateUser: (name: string) => void;
  onRenameActive: (name: string) => void;
  onDeleteActive: () => void;
  onClearActiveData: () => void;
  onLogout: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [rename, setRename] = useState(activeUser.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ textAlign: "center", marginBottom: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>Profile</div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Manage players and their isolated stats</div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>Active Player</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{activeUser.name}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Created {new Date(activeUser.createdAt).toLocaleDateString()}</div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>Switch Player</div>
        <select
          value={activeUser.id}
          onChange={(e) => {
            const nextId = e.target.value;
            onSwitchUser(nextId);
            const next = users.find(u => u.id === nextId);
            if (next) setRename(next.name);
          }}
          style={{ width: "100%", borderRadius: 10, padding: "10px 12px", border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontSize: 13, fontWeight: 700 }}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>Create Player</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            style={{ borderRadius: 10, padding: "10px 12px", border: "1px solid #d1d5db", fontSize: 13 }}
          />
          <button
            onClick={() => {
              const n = newName.trim();
              if (!n) return;
              onCreateUser(n);
              setNewName("");
            }}
            style={{ ...S.btn("#22c55e"), width: 88, padding: "10px 0", fontSize: 12 }}
          >
            Add
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>Rename Active Player</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            placeholder="New display name"
            style={{ borderRadius: 10, padding: "10px 12px", border: "1px solid #d1d5db", fontSize: 13 }}
          />
          <button
            onClick={() => {
              const n = rename.trim();
              if (!n) return;
              onRenameActive(n);
            }}
            style={{ ...S.btn("#2563eb"), width: 88, padding: "10px 0", fontSize: 12 }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>Danger Zone</div>
        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={onClearActiveData} style={{ ...S.btn("#f97316", 12), padding: "10px 0" }}>Clear Active Player Stats</button>
          <button onClick={onDeleteActive} disabled={users.length <= 1} style={{ ...S.btn(users.length <= 1 ? "#d1d5db" : "#dc2626", 12), padding: "10px 0", cursor: users.length <= 1 ? "default" : "pointer" }}>Delete Active Player</button>
          {users.length <= 1 && <div style={{ fontSize: 11, color: "#9ca3af" }}>At least one player must exist.</div>}
        </div>
      </div>

      <button onClick={onLogout} style={{ ...S.btn("#6b7280", 13), padding: "14px 0", marginTop: 4 }}>Logout</button>
    </div>
  );
}
