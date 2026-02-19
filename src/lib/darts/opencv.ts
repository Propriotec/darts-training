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
// Board detection: MediaPipe object detection + JS edge refinement
// ---------------------------------------------------------------------------

function detectBoard(img: ImageData): BoardCalibration | null {
  const { width: w, height: h, data } = img;
  const minDim = Math.min(w, h);

  // Try MediaPipe object detection first for a region hint
  let mpHint: { cx: number; cy: number; r: number } | null = null;
  if (detector) {
    try {
      // Put ImageData on an offscreen canvas for MediaPipe
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(img, 0, 0);

      const results = detector.detect(canvas as unknown as HTMLCanvasElement);
      if (results.detections.length > 0) {
        // Find the most likely dartboard detection
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

  // Find circle: use MediaPipe hint to narrow search, or full Hough
  let circle: { cx: number; cy: number; r: number } | null = null;

  if (mpHint) {
    // Refine the MediaPipe bounding box with edge-based circle fitting
    circle = refineCircle(edges, w, h, mpHint);
  }

  if (!circle) {
    circle = houghCircle(edges, w, h, minDim);
  }

  if (!circle) return null;

  // Detect wire rotation
  const rotation = detectWireRotation(
    edges, circle.cx, circle.cy, circle.r, circle.r, 0, w, h,
  );

  return {
    cx: circle.cx / w,
    cy: circle.cy / h,
    rx: circle.r / minDim,
    ry: circle.r / minDim,
    angle: 0,
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
// Circle detection
// ---------------------------------------------------------------------------

function refineCircle(
  edges: Float32Array,
  w: number,
  h: number,
  hint: { cx: number; cy: number; r: number },
): { cx: number; cy: number; r: number } | null {
  // Sample edge magnitudes along radial lines from the hint center
  // to find the actual board edge radius
  const nAngles = 36;
  const radii: number[] = [];

  for (let ai = 0; ai < nAngles; ai++) {
    const angle = (ai / nAngles) * Math.PI * 2;
    let bestR = 0;
    let bestE = 0;
    for (let r = hint.r * 0.5; r < hint.r * 1.5; r += 1) {
      const px = Math.round(hint.cx + r * Math.cos(angle));
      const py = Math.round(hint.cy + r * Math.sin(angle));
      if (px < 0 || px >= w || py < 0 || py >= h) break;
      const e = edges[py * w + px];
      if (e > bestE) {
        bestE = e;
        bestR = r;
      }
    }
    if (bestR > 0) radii.push(bestR);
  }

  if (radii.length < 12) return null;

  // Median radius
  radii.sort((a, b) => a - b);
  const medianR = radii[Math.floor(radii.length / 2)];

  return { cx: hint.cx, cy: hint.cy, r: medianR };
}

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
