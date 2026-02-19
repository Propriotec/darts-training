"use client";

export type DartType = "S" | "D" | "T" | "X";

export interface DartMarker {
  type: DartType;
  color: string;
}

export interface DartboardProps {
  /** Segment numbers to show at full opacity (rest dimmed) */
  highlight?: number[];
  /** Also highlight the bullseye */
  highlightBull?: boolean;
  /** Dart markers to display */
  darts?: DartMarker[];
  /** Segment where darts land, or "bull". Defaults to first highlighted segment */
  dartTarget?: number | "bull";
  /** Max width in px (default 260) */
  maxWidth?: number;
}

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEG_DEG = 360 / SEGMENTS.length;

const R_BULL_IN = 6.35;
const R_BULL_OUT = 15.9;
const R_TREBLE_IN = 99;
const R_TREBLE_OUT = 107;
const R_DOUBLE_IN = 162;
const R_DOUBLE_OUT = 170;

const BOARD = {
  black: "#1a1a2e",
  cream: "#f2e6c9",
  red: "#c0392b",
  green: "#1a8a4a",
  wire: "#8a8a8a",
};

function toXY(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

function arc(a0: number, a1: number, rIn: number, rOut: number): string {
  const [ox1, oy1] = toXY(a0, rOut);
  const [ox2, oy2] = toXY(a1, rOut);
  const [ix2, iy2] = toXY(a1, rIn);
  const [ix1, iy1] = toXY(a0, rIn);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M${ox1},${oy1} A${rOut},${rOut} 0 ${lg} 1 ${ox2},${oy2} L${ix2},${iy2} A${rIn},${rIn} 0 ${lg} 0 ${ix1},${iy1}Z`;
}

const OFFSETS = [
  { deg: -3.5, dr: 0 },
  { deg: 1.5, dr: 3 },
  { deg: 5, dr: -2 },
];

function dartXY(type: DartType, i: number, segIdx: number) {
  const segAngle = segIdx * SEG_DEG;
  const o = OFFSETS[i % 3];
  const base = type === "S" ? 134 : type === "D" ? 166 : type === "T" ? 103 : 183;
  const [x, y] = toXY(segAngle + o.deg, base + o.dr);
  return { x, y };
}

function bullDartXY(i: number) {
  const angles = [0, 120, 240];
  const [x, y] = toXY(angles[i % 3], 8);
  return { x, y };
}

export function Dartboard({
  highlight = [],
  highlightBull = false,
  darts = [],
  dartTarget,
  maxWidth = 260,
}: DartboardProps) {
  const hlSet = new Set(highlight);
  const hasHl = highlight.length > 0 || highlightBull;

  const target = dartTarget ?? (highlight.length > 0 ? highlight[0] : undefined);
  const targetIdx = typeof target === "number" ? SEGMENTS.indexOf(target) : -1;
  const onBull = target === "bull";

  return (
    <svg
      viewBox="-200 -200 400 400"
      style={{ width: "100%", maxWidth, margin: "8px auto", display: "block" }}
    >
      <circle cx={0} cy={0} r={R_DOUBLE_OUT + 4} fill="#0a0a14" />

      {SEGMENTS.map((num, i) => {
        const a0 = i * SEG_DEG - SEG_DEG / 2;
        const a1 = a0 + SEG_DEG;
        const even = i % 2 === 0;
        const single = even ? BOARD.black : BOARD.cream;
        const multi = even ? BOARD.red : BOARD.green;
        const lit = hlSet.has(num);
        const opacity = hasHl ? (lit ? 1 : 0.25) : 0.5;

        return (
          <g key={num} opacity={opacity}>
            <path d={arc(a0, a1, R_DOUBLE_IN, R_DOUBLE_OUT)} fill={multi} />
            <path d={arc(a0, a1, R_TREBLE_OUT, R_DOUBLE_IN)} fill={single} />
            <path d={arc(a0, a1, R_TREBLE_IN, R_TREBLE_OUT)} fill={multi} />
            <path d={arc(a0, a1, R_BULL_OUT, R_TREBLE_IN)} fill={single} />
          </g>
        );
      })}

      <circle cx={0} cy={0} r={R_BULL_OUT} fill={BOARD.green} opacity={highlightBull ? 1 : 0.25} />
      <circle cx={0} cy={0} r={R_BULL_IN} fill={BOARD.red} opacity={highlightBull ? 1 : 0.25} />

      {SEGMENTS.map((_, i) => {
        const deg = i * SEG_DEG - SEG_DEG / 2;
        const [x1, y1] = toXY(deg, R_BULL_OUT);
        const [x2, y2] = toXY(deg, R_DOUBLE_OUT);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={BOARD.wire} strokeWidth={0.5} opacity={0.3} />;
      })}

      {[R_BULL_IN, R_BULL_OUT, R_TREBLE_IN, R_TREBLE_OUT, R_DOUBLE_IN, R_DOUBLE_OUT].map((r) => (
        <circle key={r} cx={0} cy={0} r={r} fill="none" stroke={BOARD.wire} strokeWidth={0.5} opacity={0.3} />
      ))}

      {/* Label for highlighted segment(s) */}
      {highlight.map((num) => {
        const idx = SEGMENTS.indexOf(num);
        if (idx < 0) return null;
        const angle = idx * SEG_DEG;
        const [x, y] = toXY(angle, R_DOUBLE_OUT + 16);
        return (
          <text key={num} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={14} fontWeight={800} fontFamily="system-ui, sans-serif">
            {num}
          </text>
        );
      })}

      {highlightBull && highlight.length === 0 && (
        <text x={0} y={-R_DOUBLE_OUT - 14} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={12} fontWeight={800} fontFamily="system-ui, sans-serif">
          BULL
        </text>
      )}

      {darts.map((dart, i) => {
        let pos: { x: number; y: number };
        if (onBull) pos = bullDartXY(i);
        else if (targetIdx >= 0) pos = dartXY(dart.type, i, targetIdx);
        else return null;
        return (
          <g key={i}>
            <circle cx={pos.x} cy={pos.y} r={10} fill={dart.color} stroke="#fff" strokeWidth={2} />
            <circle cx={pos.x} cy={pos.y} r={3} fill="#fff" />
          </g>
        );
      })}
    </svg>
  );
}
