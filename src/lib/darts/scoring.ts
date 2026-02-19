import { DetectedHit, Multiplier } from "@/lib/darts/types";

export const DART_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const CAMERA_SAMPLE_MS = 350;

/**
 * Standard dartboard ring radii as fraction of the outer double ring edge.
 * Based on regulation dartboard measurements (WDF/BDO):
 *   Double bull:  6.35mm / 170mm
 *   Single bull: 15.9mm  / 170mm
 *   Treble inner: 99mm   / 170mm
 *   Treble outer: 107mm  / 170mm
 *   Double inner: 162mm  / 170mm
 *   Double outer: 170mm  / 170mm
 */
export const BOARD_RINGS = {
  doubleBull: 0.037,
  singleBull: 0.094,
  trebleInner: 0.582,
  trebleOuter: 0.629,
  doubleInner: 0.953,
  doubleOuter: 1.0,
} as const;

export const toScore = (hit: DetectedHit) => {
  if (hit.number === null) return 0;
  if (hit.number === "Bull") return hit.multiplier === 2 ? 50 : 25;
  return hit.number * (hit.multiplier === 0 ? 0 : hit.multiplier);
};

export const hitLabel = (hit: DetectedHit) => {
  if (hit.multiplier === 0 || hit.number === null) return "MISS";
  if (hit.number === "Bull") return hit.multiplier === 2 ? "DBULL" : "SBULL";
  if (hit.multiplier === 1) return `${hit.number}`;
  if (hit.multiplier === 2) return `D${hit.number}`;
  return `T${hit.number}`;
};

export interface BoardCalibration {
  cx: number;         // center x (normalized 0-1 of frame width)
  cy: number;         // center y (normalized 0-1 of frame height)
  rx: number;         // semi-major axis (normalized to min(w,h))
  ry: number;         // semi-minor axis (normalized to min(w,h))
  angle: number;      // ellipse rotation (radians)
  rotation: number;   // board rotation offset (radians) — where segment 20 center is relative to straight up
}

/**
 * Detect hit with perspective correction and proper board alignment.
 *
 * 1. Undo ellipse distortion (perspective) to get a circular coordinate space
 * 2. Apply board rotation offset to align with actual segment positions
 * 3. Use real dartboard ring proportions to classify the ring
 * 4. Use DART_ORDER to determine the segment number
 */
export const detectHitFromPoint = (
  x: number, y: number, width: number, height: number,
  cx: number, cy: number, radius: number,
  calib?: BoardCalibration,
): DetectedHit => {
  const px = x / width;
  const py = y / height;
  let dx = px - cx;
  let dy = py - cy;

  if (calib && calib.rx > 0 && calib.ry > 0) {
    // Undo ellipse rotation
    const cos = Math.cos(-calib.angle);
    const sin = Math.sin(-calib.angle);
    const rdx = dx * cos - dy * sin;
    const rdy = dx * sin + dy * cos;
    // Scale to circle using the larger axis as reference
    const scale = calib.rx / calib.ry;
    const sdx = rdx;
    const sdy = rdy * scale;
    // Rotate back
    const cos2 = Math.cos(calib.angle);
    const sin2 = Math.sin(calib.angle);
    dx = sdx * cos2 - sdy * sin2;
    dy = sdx * sin2 + sdy * cos2;
  }

  // Normalized distance from center (0 = center, 1 = outer double edge)
  const r = Math.hypot(dx, dy) / radius;

  // Outside the board
  if (r > 1.06) return { number: null, multiplier: 0, confidence: 0.55 };

  // Bulls
  if (r <= BOARD_RINGS.doubleBull) return { number: "Bull", multiplier: 2, confidence: 0.9 };
  if (r <= BOARD_RINGS.singleBull) return { number: "Bull", multiplier: 1, confidence: 0.85 };

  // Determine segment angle
  // atan2 gives math angle (0°=right, counter-clockwise positive)
  // Convert to clockwise-from-top: top=0°, clockwise positive
  let deg = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;

  // Apply board rotation offset if calibrated
  if (calib) {
    const rotDeg = (calib.rotation * 180) / Math.PI;
    deg = (deg - rotDeg + 360) % 360;
  }

  const idx = Math.floor(deg / 18) % 20;
  const number = DART_ORDER[idx];

  // Determine ring using real proportions
  let multiplier: Multiplier = 1;
  if (r >= BOARD_RINGS.doubleInner && r <= BOARD_RINGS.doubleOuter) {
    multiplier = 2;
  } else if (r >= BOARD_RINGS.trebleInner && r <= BOARD_RINGS.trebleOuter) {
    multiplier = 3;
  }

  return { number, multiplier, confidence: 0.75 };
};
