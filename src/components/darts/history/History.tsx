"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";

import { S } from "@/components/darts/styles";
import { TrainingData } from "@/lib/darts/types";

const dayNames = ["1", "2", "3", "4", "5", "6", "7"];

const weekAvg = (w: any[], f: string) => {
  const v = w.filter((d: any) => d).map((d: any) => d[f]);
  return v.length ? v.reduce((a: number, b: number) => a + b, 0) / v.length : null;
};

const fmt = (v: any, dec = 0) => v !== null && v !== undefined ? (dec > 0 ? Number(v).toFixed(dec) : Math.round(v)) : "-";

const trend = (vals: any[]) => {
  const f = vals.filter((v: any) => v !== null);
  if (f.length < 2) return null;
  return f[f.length - 1] > f[0] ? "up" : f[f.length - 1] < f[0] ? "down" : "same";
};

const pill = (v: any, good: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 5px",
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  background: v === null ? "transparent" : good ? "#ecfdf5" : "#f3f4f6",
  color: v === null ? "#d1d5db" : good ? "#059669" : "#374151",
});

function MiniGrid({ title, color, weeks, renderCell, summaryRows, defaultOpen = true }: { title: string; color: string; weeks: any[][]; renderCell: (d: any) => React.ReactNode; summaryRows: any[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ background: color, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{title}</span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700 }}>{open ? "\u25B2" : "\u25BC"}</span>
      </div>
      {open && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "6px 6px", textAlign: "left", color: "#9ca3af", fontWeight: 600, width: 36 }}></th>
                {dayNames.map(d => <th key={d} style={{ padding: "6px 2px", textAlign: "center", color: "#9ca3af", fontWeight: 600, minWidth: 32 }}>{d}</th>)}
                <th style={{ padding: "6px 6px", textAlign: "center", color: "#6b7280", fontWeight: 700, minWidth: 40 }}>AVG</th>
              </tr></thead>
              <tbody>
                {[0, 1, 2, 3].map(wi => (
                  <tr key={wi} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "5px 6px", fontWeight: 700, color: "#6b7280", fontSize: 11 }}>W{wi + 1}</td>
                    {weeks[wi].map((d: any, di: number) => <td key={di} style={{ padding: "3px 1px", textAlign: "center" }}>{renderCell(d)}</td>)}
                    <td style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#374151", background: "#f9fafb", fontSize: 12 }}>{summaryRows[wi] !== null ? summaryRows[wi] : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(() => {
            const t = trend(summaryRows);
            if (!t) return null;
            return (
              <div style={{ padding: "4px 14px 8px", textAlign: "right", fontSize: 12, fontWeight: 700, color: t === "up" ? "#16a34a" : t === "down" ? "#dc2626" : "#9ca3af" }}>
                {t === "up" ? "Improving ↑" : t === "down" ? "Declining ↓" : "Steady →"}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

export function History({ data }: { data: TrainingData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#374151" }}>4-Week Progress</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>7 sessions per week</div>
      </div>
      <MiniGrid title="TONS — Points" color="#059669" weeks={data.tons}
        renderCell={(d: any) => <span style={pill(d, d && d.pts >= 21)}>{d ? d.pts : "-"}</span>}
        summaryRows={data.tons.map((w: any[]) => { const a = weekAvg(w, "pts"); return a !== null ? fmt(a, 1) : null; })} />
      <MiniGrid title="TONS — Darts/Point" color="#059669" weeks={data.tons}
        renderCell={(d: any) => <span style={pill(d, d && d.pts > 0 && d.darts / d.pts < 10)}>{d && d.pts > 0 ? (d.darts / d.pts).toFixed(1) : "-"}</span>}
        summaryRows={data.tons.map((w: any[]) => { const f = w.filter((d: any) => d && d.pts > 0); if (!f.length) return null; return fmt(f.reduce((a: number, d: any) => a + d.darts / d.pts, 0) / f.length, 1); })} />
      <MiniGrid title="LADDER — Finishing Score" color="#2563eb" weeks={data.ladder}
        renderCell={(d: any) => <span style={pill(d, d && d.finish > d.start)}>{d ? d.finish : "-"}</span>}
        summaryRows={data.ladder.map((w: any[]) => { const f = w.filter((d: any) => d).map((d: any) => d.finish); return f.length ? fmt(Math.max(...f)) : null; })} />
      <MiniGrid title="JDC — Total" color="#7c3aed" weeks={data.jdc}
        renderCell={(d: any) => <span style={pill(d, d && d.total >= 400)}>{d ? d.total : "-"}</span>}
        summaryRows={data.jdc.map((w: any[]) => { const a = weekAvg(w, "total"); return a !== null ? fmt(a) : null; })} />
      {data.atc && (
        <>
          <MiniGrid title="ATC — Hits" color="#6366f1" weeks={data.atc}
            renderCell={(d: any) => <span style={pill(d, d && d.darts > 0 && d.hits / d.darts >= 0.5)}>{d ? d.hits : "-"}</span>}
            summaryRows={data.atc.map((w: any[]) => { const a = weekAvg(w, "hits"); return a !== null ? fmt(a, 1) : null; })} />
          <MiniGrid title="ATC — Accuracy %" color="#6366f1" weeks={data.atc}
            renderCell={(d: any) => <span style={pill(d, d && d.darts > 0 && d.hits / d.darts >= 0.5)}>{d && d.darts > 0 ? `${Math.round((d.hits / d.darts) * 100)}` : "-"}</span>}
            summaryRows={data.atc.map((w: any[]) => { const f = w.filter((d: any) => d && d.darts > 0); if (!f.length) return null; const acc = f.reduce((a: number, d: any) => a + (d.hits / d.darts) * 100, 0) / f.length; return fmt(acc, 1); })} />
        </>
      )}
    </div>
  );
}
