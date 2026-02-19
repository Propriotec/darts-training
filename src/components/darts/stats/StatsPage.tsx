"use client";

import { useState } from "react";

import { S } from "@/components/darts/styles";
import { calculateTrainingStats } from "@/lib/darts/stats";
import { TrainingData } from "@/lib/darts/types";

const fmt = (v: number, d = 1) => Number.isFinite(v) ? v.toFixed(d) : "0.0";
const pct = (v: number) => `${Math.round(v)}%`;

type GameKey = "all" | "tons" | "ladder" | "jdc" | "atc";

const TABS: Array<{ key: GameKey; label: string; color: string }> = [
  { key: "all", label: "All", color: "#111827" },
  { key: "tons", label: "Tons", color: "#059669" },
  { key: "ladder", label: "Ladder", color: "#2563eb" },
  { key: "jdc", label: "JDC", color: "#7c3aed" },
  { key: "atc", label: "ATC", color: "#6366f1" },
];

function StatCard({ title, items, color }: { title: string; color: string; items: Array<{ label: string; value: string }> }) {
  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
      <div style={{ background: color, color: "#fff", padding: "10px 12px", fontSize: 12, fontWeight: 800, letterSpacing: 0.4 }}>{title}</div>
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map((item) => (
          <div key={item.label} style={{ background: "#f9fafb", border: "1px solid #eef2f7", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: 19, color: "#111827", fontWeight: 900, marginTop: 2 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsPage({ data }: { data: TrainingData }) {
  const [selected, setSelected] = useState<GameKey>("all");
  const s = calculateTrainingStats(data);
  const activeTab = TABS.find(t => t.key === selected)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ textAlign: "center", marginBottom: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>Training Stats</div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>All-time metrics for selected profile</div>
      </div>

      {/* Game selector tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelected(tab.key)}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: selected === tab.key ? tab.color : "#f3f4f6",
              color: selected === tab.key ? "#fff" : "#6b7280",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* All overview */}
      {selected === "all" && (
        <>
          <StatCard
            title="TOTALS"
            color={activeTab.color}
            items={[
              { label: "Sessions", value: String(s.totals.sessions) },
              { label: "Slot Fill", value: pct(s.totals.slotFillRate) },
              { label: "TONS Sessions", value: String(s.totals.tonsSessions) },
              { label: "LADDER Sessions", value: String(s.totals.ladderSessions) },
              { label: "JDC Sessions", value: String(s.totals.jdcSessions) },
              { label: "ATC Sessions", value: String(s.totals.atcSessions) },
              { label: "Used / Total", value: `${s.totals.slotsUsed}/${s.totals.slotsTotal}` },
            ]}
          />
        </>
      )}

      {/* Tons */}
      {selected === "tons" && (
        <StatCard
          title="TONS"
          color={activeTab.color}
          items={[
            { label: "Sessions", value: String(s.totals.tonsSessions) },
            { label: "Avg Points", value: fmt(s.tons.avgPoints, 1) },
            { label: "Best Points", value: fmt(s.tons.bestPoints, 0) },
            { label: "Avg Darts/Point", value: fmt(s.tons.avgDartsPerPoint, 2) },
            { label: "21+ Completion", value: pct(s.tons.completedRate) },
          ]}
        />
      )}

      {/* Ladder */}
      {selected === "ladder" && (
        <StatCard
          title="LADDER"
          color={activeTab.color}
          items={[
            { label: "Sessions", value: String(s.totals.ladderSessions) },
            { label: "Avg Finish", value: fmt(s.ladder.avgFinish, 1) },
            { label: "Best Finish", value: fmt(s.ladder.bestFinish, 0) },
            { label: "Avg Delta", value: `${s.ladder.avgDelta >= 0 ? "+" : ""}${fmt(s.ladder.avgDelta, 1)}` },
            { label: "Throw Hit Rate", value: pct(s.ladder.hitRate) },
            { label: "Session Success", value: pct(s.ladder.successfulRate) },
          ]}
        />
      )}

      {/* JDC */}
      {selected === "jdc" && (
        <StatCard
          title="JDC"
          color={activeTab.color}
          items={[
            { label: "Sessions", value: String(s.totals.jdcSessions) },
            { label: "Avg Total", value: fmt(s.jdc.avgTotal, 1) },
            { label: "Best Total", value: fmt(s.jdc.bestTotal, 0) },
            { label: "Avg SH 10-15", value: fmt(s.jdc.avgSh1, 1) },
            { label: "Avg Doubles", value: fmt(s.jdc.avgDbl, 1) },
            { label: "Avg SH 15-20", value: fmt(s.jdc.avgSh2, 1) },
            { label: "400+ Pass", value: pct(s.jdc.passRate) },
          ]}
        />
      )}

      {/* ATC */}
      {selected === "atc" && (
        <StatCard
          title="AROUND THE CLOCK"
          color={activeTab.color}
          items={[
            { label: "Sessions", value: String(s.atc.sessions) },
            { label: "Total Hits", value: String(s.atc.totalHits) },
            { label: "Total Darts", value: String(s.atc.totalDarts) },
            { label: "Accuracy", value: pct(s.atc.accuracy) },
            { label: "Best Accuracy", value: pct(s.atc.bestAccuracy) },
          ]}
        />
      )}
    </div>
  );
}
