/**
 * Barrel-distortion correction utilities.
 *
 * `k` (strength) ranges from 0 (none) to ~0.4 (heavy correction).
 * For each output (undistorted) pixel P we sample the distorted input at
 *   P' = center + (P − center) · (1 + k · r²)
 * where r is the normalised distance from image center.
 */

/** Precompute a remap table: map[outIdx] → inIdx (−1 = out-of-bounds). */
export function createUndistortMap(
  w: number,
  h: number,
  k: number,
): Int32Array {
  const map = new Int32Array(w * h);
  const cx = w / 2;
  const cy = h / 2;
  const norm = Math.min(w, h) / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xn = (x - cx) / norm;
      const yn = (y - cy) / norm;
      const r2 = xn * xn + yn * yn;
      const f = 1 + k * r2;
      const sx = Math.round(cx + xn * f * norm);
      const sy = Math.round(cy + yn * f * norm);
      map[y * w + x] =
        sx >= 0 && sx < w && sy >= 0 && sy < h ? sy * w + sx : -1;
    }
  }
  return map;
}

/** Apply a remap table to RGBA ImageData (mutates in place). */
export function applyUndistortRGBA(
  imageData: ImageData,
  map: Int32Array,
): void {
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  for (let i = 0; i < map.length; i++) {
    const si = map[i];
    const di = i << 2;
    if (si >= 0) {
      const sj = si << 2;
      dst[di] = src[sj];
      dst[di + 1] = src[sj + 1];
      dst[di + 2] = src[sj + 2];
      dst[di + 3] = 255;
    } else {
      dst[di] = dst[di + 1] = dst[di + 2] = 0;
      dst[di + 3] = 255;
    }
  }
}

/**
 * Correct a single detected point from distorted → undistorted coords.
 * (Approximate inverse of the barrel model.)
 */
export function undistortPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  k: number,
): [number, number] {
  if (k <= 0) return [x, y];
  const cx = w / 2;
  const cy = h / 2;
  const norm = Math.min(w, h) / 2;
  const xn = (x - cx) / norm;
  const yn = (y - cy) / norm;
  const r2 = xn * xn + yn * yn;
  const f = 1 + k * r2;
  if (f < 0.01) return [cx, cy];
  return [cx + (xn / f) * norm, cy + (yn / f) * norm];
}
