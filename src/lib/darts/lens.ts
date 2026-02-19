/**
 * Barrel / fisheye lens distortion correction utilities.
 *
 * Model: P' = center + (P - center) * (1 + k * r^2)
 *
 * k > 0  =>  barrel (pincushion-inward) distortion correction
 * k = 0  =>  no correction
 *
 * The lookup table (LUT) maps each output pixel to its source pixel
 * in the distorted input, allowing a single pass to undistort the frame.
 */

export interface UndistortMap {
  width: number;
  height: number;
  /** Flat array of length width*height — each entry is the source pixel index in RGBA (i.e. srcIndex*4 into ImageData.data). */
  srcIndices: Int32Array;
}

/**
 * Precompute a lookup table that maps each output (corrected) pixel
 * to its source (distorted) pixel index.
 *
 * @param w  frame width in pixels
 * @param h  frame height in pixels
 * @param k  distortion coefficient (0 = none, 0.40 = heavy correction)
 */
export function createUndistortMap(w: number, h: number, k: number): UndistortMap {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const srcIndices = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / maxR;
      const scale = 1 + k * r * r;
      const srcX = Math.round(cx + dx * scale);
      const srcY = Math.round(cy + dy * scale);

      if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
        srcIndices[y * w + x] = (srcY * w + srcX) * 4;
      } else {
        // Out of bounds — map to pixel (0,0) as fallback (will be black border)
        srcIndices[y * w + x] = -1;
      }
    }
  }

  return { width: w, height: h, srcIndices };
}

/**
 * Apply the precomputed undistortion LUT to an RGBA ImageData buffer in-place.
 *
 * Reads from the original data, writes corrected pixels back into the same buffer.
 */
export function applyUndistortRGBA(imageData: ImageData, map: UndistortMap): void {
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const len = map.width * map.height;

  for (let i = 0; i < len; i++) {
    const srcIdx = map.srcIndices[i];
    const dstIdx = i * 4;

    if (srcIdx >= 0) {
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    } else {
      dst[dstIdx] = 0;
      dst[dstIdx + 1] = 0;
      dst[dstIdx + 2] = 0;
      dst[dstIdx + 3] = 255;
    }
  }
}

/**
 * Correct a single point from distorted coordinates to undistorted coordinates.
 *
 * This is the approximate inverse of the distortion model.
 * Given a point (x, y) in the distorted image, returns where that point
 * would appear in the undistorted output.
 *
 * @param x  x-coordinate in distorted frame
 * @param y  y-coordinate in distorted frame
 * @param w  frame width
 * @param h  frame height
 * @param k  distortion coefficient
 */
export function undistortPoint(
  x: number, y: number,
  w: number, h: number,
  k: number,
): { x: number; y: number } {
  if (k === 0) return { x, y };

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy) / maxR;

  // The distortion model is: P_distorted = center + (P_undistorted - center) * (1 + k*r²)
  // To invert: P_undistorted = center + (P_distorted - center) / (1 + k*r²)
  // This is approximate since r should be from the undistorted space,
  // but for small-to-moderate k it converges well.
  const scale = 1 + k * r * r;
  return {
    x: cx + dx / scale,
    y: cy + dy / scale,
  };
}
