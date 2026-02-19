import { TrainingData } from "@/lib/darts/types";

type TonsSession = { pts?: number; darts?: number };
type LadderSession = { start?: number; finish?: number; attempts?: number; hits?: number };
type JdcSession = { total?: number; sh1?: number; dbl?: number; sh2?: number };
type AtcSession = { hits?: number; darts?: number; targetType?: string; dartsPerNumber?: number; advanceMode?: string };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const flatten = (weeks: Array<Array<Record<string, unknown> | null>>) => weeks.flat().filter(Boolean) as Record<string, unknown>[];

export type TrainingStats = {
  totals: {
    sessions: number;
    tonsSessions: number;
    ladderSessions: number;
    jdcSessions: number;
    atcSessions: number;
    slotsUsed: number;
    slotsTotal: number;
    slotFillRate: number;
  };
  tons: {
    avgPoints: number;
    bestPoints: number;
    avgDartsPerPoint: number;
    completedRate: number;
  };
  ladder: {
    avgFinish: number;
    bestFinish: number;
    avgDelta: number;
    hitRate: number;
    successfulRate: number;
  };
  jdc: {
    avgTotal: number;
    bestTotal: number;
    avgSh1: number;
    avgDbl: number;
    avgSh2: number;
    passRate: number;
  };
  atc: {
    sessions: number;
    totalHits: number;
    totalDarts: number;
    accuracy: number;
    bestAccuracy: number;
  };
};

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

export function calculateTrainingStats(data: TrainingData): TrainingStats {
  const tons = flatten(data.tons) as TonsSession[];
  const ladder = flatten(data.ladder) as LadderSession[];
  const jdc = flatten(data.jdc) as JdcSession[];
  const atc = flatten(data.atc ?? []) as AtcSession[];

  const tonsPts = tons.map(s => num(s.pts)).filter((v): v is number => v !== null);
  const tonsDpp = tons
    .map(s => {
      const p = num(s.pts);
      const d = num(s.darts);
      if (p === null || d === null || p <= 0) return null;
      return d / p;
    })
    .filter((v): v is number => v !== null);
  const tonsCompleted = tonsPts.filter(v => v >= 21).length;

  const ladderFinish = ladder.map(s => num(s.finish)).filter((v): v is number => v !== null);
  const ladderDelta = ladder
    .map(s => {
      const f = num(s.finish);
      const st = num(s.start);
      return f !== null && st !== null ? f - st : null;
    })
    .filter((v): v is number => v !== null);
  const ladderAttempts = ladder.map(s => num(s.attempts)).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
  const ladderHits = ladder.map(s => num(s.hits)).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
  const ladderSuccesses = ladderDelta.filter(v => v > 0).length;

  const jdcTotal = jdc.map(s => num(s.total)).filter((v): v is number => v !== null);
  const jdcSh1 = jdc.map(s => num(s.sh1)).filter((v): v is number => v !== null);
  const jdcDbl = jdc.map(s => num(s.dbl)).filter((v): v is number => v !== null);
  const jdcSh2 = jdc.map(s => num(s.sh2)).filter((v): v is number => v !== null);
  const jdcPasses = jdcTotal.filter(v => v >= 400).length;

  const atcHits = atc.map(s => num(s.hits)).filter((v): v is number => v !== null);
  const atcDarts = atc.map(s => num(s.darts)).filter((v): v is number => v !== null);
  const atcTotalHits = atcHits.reduce((a, b) => a + b, 0);
  const atcTotalDarts = atcDarts.reduce((a, b) => a + b, 0);
  const atcPerSession = atc.map(s => {
    const h = num(s.hits);
    const d = num(s.darts);
    return h !== null && d !== null && d > 0 ? (h / d) * 100 : null;
  }).filter((v): v is number => v !== null);

  const sessions = tons.length + ladder.length + jdc.length + atc.length;
  const slotsTotal = (data.tons.length + data.ladder.length + data.jdc.length + (data.atc ?? []).length) * 7;
  const slotsUsed = sessions;

  return {
    totals: {
      sessions,
      tonsSessions: tons.length,
      ladderSessions: ladder.length,
      jdcSessions: jdc.length,
      atcSessions: atc.length,
      slotsUsed,
      slotsTotal,
      slotFillRate: pct(slotsUsed, slotsTotal),
    },
    tons: {
      avgPoints: avg(tonsPts),
      bestPoints: tonsPts.length ? Math.max(...tonsPts) : 0,
      avgDartsPerPoint: avg(tonsDpp),
      completedRate: pct(tonsCompleted, tons.length),
    },
    ladder: {
      avgFinish: avg(ladderFinish),
      bestFinish: ladderFinish.length ? Math.max(...ladderFinish) : 0,
      avgDelta: avg(ladderDelta),
      hitRate: pct(ladderHits, ladderAttempts),
      successfulRate: pct(ladderSuccesses, ladder.length),
    },
    jdc: {
      avgTotal: avg(jdcTotal),
      bestTotal: jdcTotal.length ? Math.max(...jdcTotal) : 0,
      avgSh1: avg(jdcSh1),
      avgDbl: avg(jdcDbl),
      avgSh2: avg(jdcSh2),
      passRate: pct(jdcPasses, jdc.length),
    },
    atc: {
      sessions: atc.length,
      totalHits: atcTotalHits,
      totalDarts: atcTotalDarts,
      accuracy: pct(atcTotalHits, atcTotalDarts),
      bestAccuracy: atcPerSession.length ? Math.max(...atcPerSession) : 0,
    },
  };
}
