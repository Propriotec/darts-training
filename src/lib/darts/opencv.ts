"use client";

import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { BoardCalibration } from "@/lib/darts/scoring";

const BOARD_RINGS = {
  doubleBull: 0.037,
  singleBull: 0.094,
  trebleInner: 0.582,
  trebleOuter: 0.629,
  doubleInner: 0.953,
  doubleOuter: 1.0,
};

// Circular object categories from COCO that could be a dartboard
const BOARD_CATEGORIES = new Set(["clock", "sports ball", "frisbee", "bowl"]);

let detector: ObjectDetector | null = null;
let initPromise: Promise<void> | null = null;
let ready = false;

export function loadOpenCV(): Promise<void> {
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "/mediapipe/wasm",
    );
    detector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/mediapipe/efficientdet_lite0.tflite",
      },
      scoreThreshold: 0.25,
      maxResults: 10,
      runningMode: "IMAGE",
    });
    ready = true;
  })();

  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}

export function isReady(): boolean {
  return ready;
}

export function detectBoardAsync(
  imageData: ImageData,
): Promise<BoardCalibration | null> {
  return Promise.resolve(detectBoard(imageData));
}

// ---------------------------------------------------------------------------
// Board detection: MediaPipe object detection + JS ellipse refinement
// ---------------------------------------------------------------------------

interface EllipseResult {
  cx: number; cy: number;
  rx: number; ry: number; // semi-major >= semi-minor, in pixels
  angle: number;          // rotation of semi-major axis (radians)
}

function detectBoard(img: ImageData): BoardCalibration | null {
  const { width: w, height: h, data } = img;
  const minDim = Math.min(w, h);

  // Try MediaPipe object detection first for a region hint
  let mpHint: { cx: number; cy: number; r: number } | null = null;
  if (detector) {
    try {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(img, 0, 0);

      const results = detector.detect(canvas as unknown as HTMLCanvasElement);
      if (results.detections.length > 0) {
        let bestDet = results.detections[0];
        let bestScore = 0;
        for (const det of results.detections) {
          const cat = det.categories[0]?.categoryName ?? "";
          const isBoard = BOARD_CATEGORIES.has(cat);
          const score = (det.categories[0]?.score ?? 0) * (isBoard ? 2 : 1);
          if (score > bestScore) {
            bestScore = score;
            bestDet = det;
          }
        }
        const bb = bestDet.boundingBox;
        if (bb) {
          mpHint = {
            cx: bb.originX + bb.width / 2,
            cy: bb.originY + bb.height / 2,
            r: Math.max(bb.width, bb.height) / 2,
          };
        }
      }
    } catch {
      // MediaPipe failed — fall through to JS detection
    }
  }

  // Grayscale + blur + edges
  const gray = toGrayscale(data, w, h);
  const blurred = gaussianBlur(gray, w, h);
  const edges = sobelEdges(blurred, w, h);

  // Find board shape: try ellipse refinement from hint, then Hough fallback
  let ellipse: EllipseResult | null = null;

  if (mpHint) {
    ellipse = refineEllipse(edges, w, h, mpHint);
  }

  if (!ellipse) {
    const circle = houghCircle(edges, w, h, minDim);
    if (circle) {
      ellipse = refineEllipse(edges, w, h, circle);
    }
  }

  if (!ellipse) return null;

  // Detect wire rotation using the ellipse geometry
  const rotation = detectWireRotation(
    edges, ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, ellipse.angle, w, h,
  );

  return {
    cx: ellipse.cx / w,
    cy: ellipse.cy / h,
    rx: ellipse.rx / minDim,
    ry: ellipse.ry / minDim,
    angle: ellipse.angle,
    rotation,
  };
}

// ---------------------------------------------------------------------------
// Image processing helpers
// ---------------------------------------------------------------------------

function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0, gi = 0; i < data.length; i += 4, gi++) {
    gray[gi] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return gray;
}

function gaussianBlur(src: Float32Array, w: number, h: number): Float32Array {
  const k = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ki = -2; ki <= 2; ki++) {
        sum += src[y * w + Math.min(w - 1, Math.max(0, x + ki))] * k[ki + 2];
      }
      tmp[y * w + x] = sum;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ki = -2; ki <= 2; ki++) {
        sum += tmp[Math.min(h - 1, Math.max(0, y + ki)) * w + x] * k[ki + 2];
      }
      out[y * w + x] = sum;
    }
  }
  return out;
}

function sobelEdges(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = src[(y - 1) * w + (x - 1)];
      const tc = src[(y - 1) * w + x];
      const tr = src[(y - 1) * w + (x + 1)];
      const ml = src[y * w + (x - 1)];
      const mr = src[y * w + (x + 1)];
      const bl = src[(y + 1) * w + (x - 1)];
      const bc = src[(y + 1) * w + x];
      const br = src[(y + 1) * w + (x + 1)];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      out[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ellipse detection — replaces the old circle-only refineCircle
// ---------------------------------------------------------------------------

/**
 * Sample edge peaks along radial lines from a center point.
 * Returns (angle, radius, x, y) for each direction where a strong edge was found.
 */
function sampleEdgePeaks(
  edges: Float32Array, w: number, h: number,
  cx: number, cy: number, rHint: number, nAngles: number,
): Array<{ angle: number; r: number; x: number; y: number }> {
  const samples: Array<{ angle: number; r: number; x: number; y: number }> = [];
  for (let ai = 0; ai < nAngles; ai++) {
    const angle = (ai / nAngles) * Math.PI * 2;
    let bestR = 0, bestE = 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let r = rHint * 0.4; r < rHint * 1.6; r += 1) {
      const px = Math.round(cx + r * cosA);
      const py = Math.round(cy + r * sinA);
      if (px < 0 || px >= w || py < 0 || py >= h) break;
      const e = edges[py * w + px];
      if (e > bestE) { bestE = e; bestR = r; }
    }
    if (bestR > 0) {
      samples.push({
        angle, r: bestR,
        x: cx + bestR * cosA,
        y: cy + bestR * sinA,
      });
    }
  }
  return samples;
}

/**
 * Refine center estimate using opposite-point midpoints.
 * For each radial sample, find the nearest opposite sample (180° away)
 * and compute their midpoint — should converge on the true ellipse center.
 */
function refineCenterFromOpposites(
  samples: Array<{ angle: number; x: number; y: number }>,
  fallbackCx: number, fallbackCy: number,
): { cx: number; cy: number } {
  const midXs: number[] = [];
  const midYs: number[] = [];
  const angleTol = Math.PI / 18; // ~10°

  for (let i = 0; i < samples.length; i++) {
    const targetAngle = samples[i].angle + Math.PI;
    let bestJ = -1, bestDiff = Infinity;
    for (let j = 0; j < samples.length; j++) {
      if (j === i) continue;
      let diff = Math.abs(samples[j].angle - targetAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < bestDiff) { bestDiff = diff; bestJ = j; }
    }
    if (bestJ >= 0 && bestDiff < angleTol) {
      midXs.push((samples[i].x + samples[bestJ].x) / 2);
      midYs.push((samples[i].y + samples[bestJ].y) / 2);
    }
  }

  if (midXs.length < 8) return { cx: fallbackCx, cy: fallbackCy };

  // Median for robustness against outliers
  midXs.sort((a, b) => a - b);
  midYs.sort((a, b) => a - b);
  return {
    cx: midXs[Math.floor(midXs.length / 2)],
    cy: midYs[Math.floor(midYs.length / 2)],
  };
}

/**
 * Fit an ellipse to radial samples using linear least squares.
 *
 * For an ellipse centered at origin with semi-axes a, b and rotation φ,
 * the radius at angle θ satisfies:
 *   1/r² = c0 + c1·cos(2θ) + c2·sin(2θ)
 * where:
 *   c0 = 1/(2a²) + 1/(2b²)
 *   c1·cos(2φ) + c2·sin(2φ) = q  (amplitude of variation)
 *
 * This is a 3-parameter linear system solved via normal equations.
 */
function fitEllipseFromRadii(
  samples: Array<{ angle: number; r: number }>,
): EllipseResult | null {
  if (samples.length < 12) return null;

  // Build 3x3 normal equations: A^T A x = A^T b
  // where each row is [1, cos(2θ), sin(2θ)] and b = 1/r²
  let s00 = 0, s01 = 0, s02 = 0, s0b = 0;
  let s11 = 0, s12 = 0, s1b = 0;
  let s22 = 0, s2b = 0;

  for (const s of samples) {
    const invR2 = 1 / (s.r * s.r);
    const cos2 = Math.cos(2 * s.angle);
    const sin2 = Math.sin(2 * s.angle);
    s00 += 1;
    s01 += cos2;
    s02 += sin2;
    s0b += invR2;
    s11 += cos2 * cos2;
    s12 += cos2 * sin2;
    s1b += cos2 * invR2;
    s22 += sin2 * sin2;
    s2b += sin2 * invR2;
  }

  // Solve 3×3 via Cramer's rule
  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s12 - s11 * s02);
  if (Math.abs(det) < 1e-12) return null;

  const c0 = (
    s0b * (s11 * s22 - s12 * s12) -
    s01 * (s1b * s22 - s12 * s2b) +
    s02 * (s1b * s12 - s11 * s2b)
  ) / det;
  const c1 = (
    s00 * (s1b * s22 - s12 * s2b) -
    s0b * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s2b - s1b * s02)
  ) / det;
  const c2 = (
    s00 * (s11 * s2b - s1b * s12) -
    s01 * (s01 * s2b - s1b * s02) +
    s0b * (s01 * s12 - s11 * s02)
  ) / det;

  const q = Math.sqrt(c1 * c1 + c2 * c2);
  const p = c0;

  // Both (p + q) and (p - q) must be positive for a valid ellipse
  if (p - q <= 0 || p + q <= 0) return null;

  // Semi-axes from the polar fit:
  //   At θ = φ_max (direction of max r): 1/r² = p - q → r = 1/√(p-q) = semi-major
  //   At θ = φ_max + π/2:                1/r² = p + q → r = 1/√(p+q) = semi-minor
  const semiMajor = 1 / Math.sqrt(p - q);
  const semiMinor = 1 / Math.sqrt(p + q);

  // Direction of the semi-major axis (where r is maximized / 1/r² minimized)
  // The cosine component c1·cos(2θ)+c2·sin(2θ) is minimized when 2θ = atan2(c2,c1) + π
  const angle = (Math.atan2(c2, c1) + Math.PI) / 2;

  return { cx: 0, cy: 0, rx: semiMajor, ry: semiMinor, angle };
}

/**
 * Refine a rough circle hint into a full ellipse fit.
 *
 * Steps:
 * 1. Sample edge peaks at 72 angles from the hint center
 * 2. Reject outliers using median filtering
 * 3. Refine center using opposite-point midpoints
 * 4. Resample from refined center
 * 5. Fit ellipse with linear least squares on 1/r²
 */
function refineEllipse(
  edges: Float32Array,
  w: number, h: number,
  hint: { cx: number; cy: number; r: number },
): EllipseResult | null {
  const N_ANGLES = 72;

  // --- Pass 1: initial edge samples from hint center ---
  let samples = sampleEdgePeaks(edges, w, h, hint.cx, hint.cy, hint.r, N_ANGLES);
  if (samples.length < 24) return null;

  // Reject outliers: keep samples within 35% of median radius
  const radii = samples.map(s => s.r).sort((a, b) => a - b);
  const medianR = radii[Math.floor(radii.length / 2)];
  samples = samples.filter(s => Math.abs(s.r - medianR) / medianR < 0.35);
  if (samples.length < 18) return null;

  // --- Refine center using opposite-point midpoints ---
  const { cx: rcx, cy: rcy } = refineCenterFromOpposites(samples, hint.cx, hint.cy);

  // --- Pass 2: resample from refined center ---
  samples = sampleEdgePeaks(edges, w, h, rcx, rcy, medianR, N_ANGLES);
  if (samples.length < 24) return null;

  // Outlier rejection again
  const radii2 = samples.map(s => s.r).sort((a, b) => a - b);
  const medianR2 = radii2[Math.floor(radii2.length / 2)];
  samples = samples.filter(s => Math.abs(s.r - medianR2) / medianR2 < 0.35);
  if (samples.length < 18) return null;

  // --- Fit ellipse ---
  const fit = fitEllipseFromRadii(samples);
  if (!fit) return null;

  // Sanity: reject extreme aspect ratios (> 2:1 likely a false detection)
  if (fit.rx > fit.ry * 2 || fit.ry <= 0) return null;

  return { cx: rcx, cy: rcy, rx: fit.rx, ry: fit.ry, angle: fit.angle };
}

// ---------------------------------------------------------------------------
// Hough circle detection (fallback when no MediaPipe hint)
// ---------------------------------------------------------------------------

function houghCircle(
  edges: Float32Array,
  w: number,
  h: number,
  minDim: number,
): { cx: number; cy: number; r: number } | null {
  const rMin = Math.floor(minDim * 0.15);
  const rMax = Math.floor(minDim * 0.50);
  const rStep = 2;
  const cStep = 4;

  let maxE = 0;
  for (let i = 0; i < edges.length; i++) if (edges[i] > maxE) maxE = edges[i];
  const thresh = maxE * 0.25;

  const pts: number[] = [];
  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      if (edges[y * w + x] > thresh) pts.push(x, y);
    }
  }
  if (pts.length < 20) return null;

  let best: { cx: number; cy: number; r: number; score: number } | null = null;

  for (let r = rMin; r <= rMax; r += rStep) {
    const accW = Math.ceil(w / cStep);
    const accH = Math.ceil(h / cStep);
    const acc = new Uint16Array(accW * accH);

    for (let pi = 0; pi < pts.length; pi += 2) {
      const px = pts[pi];
      const py = pts[pi + 1];
      for (let ai = 0; ai < 12; ai++) {
        const angle = (ai / 12) * Math.PI * 2;
        const bx = Math.floor((px + r * Math.cos(angle)) / cStep);
        const by = Math.floor((py + r * Math.sin(angle)) / cStep);
        if (bx >= 0 && bx < accW && by >= 0 && by < accH) {
          acc[by * accW + bx]++;
        }
      }
    }

    for (let i = 0; i < acc.length; i++) {
      if (acc[i] > 0) {
        const bx = (i % accW) * cStep + cStep / 2;
        const by = Math.floor(i / accW) * cStep + cStep / 2;
        const distFromCenter = Math.hypot(bx - w / 2, by - h / 2);
        const centerBonus = 1 - distFromCenter / (minDim * 0.5);
        const score = acc[i] * Math.max(0.1, centerBonus);
        if (!best || score > best.score) {
          best = { cx: bx, cy: by, r, score };
        }
      }
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Wire rotation detection
// ---------------------------------------------------------------------------

function detectWireRotation(
  edges: Float32Array,
  cx: number, cy: number,
  rx: number, ry: number,
  eAngle: number,
  w: number, h: number,
): number {
  const N = 360;
  const profile = new Float32Array(N);
  const rIn = BOARD_RINGS.trebleOuter + 0.05;
  const rOut = BOARD_RINGS.doubleInner - 0.05;
  const nS = 8;
  const cosE = Math.cos(eAngle);
  const sinE = Math.sin(eAngle);

  for (let ai = 0; ai < N; ai++) {
    const angle = (ai / N) * Math.PI * 2;
    let sum = 0;
    for (let si = 0; si < nS; si++) {
      const frac = rIn + (rOut - rIn) * (si / (nS - 1));
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const ex = ux * rx * frac;
      const ey = uy * ry * frac;
      const px = Math.round(cx + ex * cosE - ey * sinE);
      const py = Math.round(cy + ex * sinE + ey * cosE);
      if (px >= 0 && px < w && py >= 0 && py < h) {
        sum += edges[py * w + px];
      }
    }
    profile[ai] = sum;
  }

  const smoothed = new Float32Array(N);
  const k = 3;
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let j = -k; j <= k; j++) s += profile[(i + j + N) % N];
    smoothed[i] = s / (k * 2 + 1);
  }

  let bestOff = 0;
  let bestSc = -1;
  for (let off = 0; off < 18; off += 0.5) {
    let sc = 0;
    for (let n = 0; n < 20; n++) {
      const wd = (off + n * 18) % 360;
      const idx = Math.round(wd) % N;
      for (let j = -1; j <= 1; j++) sc += smoothed[(idx + j + N) % N];
    }
    if (sc > bestSc) { bestSc = sc; bestOff = off; }
  }

  const TOP = 270;
  let cW = 0;
  let cD = 360;
  for (let n = 0; n < 20; n++) {
    const wd = (bestOff + n * 18) % 360;
    let d = Math.abs(wd - TOP);
    if (d > 180) d = 360 - d;
    if (d < cD) { cD = d; cW = n; }
  }
  const wa = (bestOff + cW * 18) % 360;
  const c1 = (wa + 9) % 360;
  const c2 = (wa - 9 + 360) % 360;
  let d1 = Math.abs(c1 - TOP); if (d1 > 180) d1 = 360 - d1;
  let d2 = Math.abs(c2 - TOP); if (d2 > 180) d2 = 360 - d2;
  const seg = d1 < d2 ? c1 : c2;
  let rot = seg - TOP;
  if (rot > 180) rot -= 360;
  if (rot < -180) rot += 360;
  return (rot * Math.PI) / 180;
}
