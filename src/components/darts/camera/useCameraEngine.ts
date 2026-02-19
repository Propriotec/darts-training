"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BoardCalibration, CAMERA_SAMPLE_MS, detectHitFromPoint, hitLabel } from "@/lib/darts/scoring";
import { detectBoardAsync, isReady, loadOpenCV } from "@/lib/darts/opencv";
import { AutoThrowEvent, DetectedHit, GameTab } from "@/lib/darts/types";

export interface CameraEngineState {
  cameraOn: boolean;
  cameraError: string;
  cameraStatus: string;
  boardCenterX: number;
  boardCenterY: number;
  boardRadius: number;
  boardCalib: BoardCalibration | null;
  cvReady: boolean;
}

export interface CameraEngineActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  autoCalibrate: () => Promise<void>;
  setBoardRadius: (v: number) => void;
}

export interface CameraEngineRefs {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface UseCameraEngineReturn {
  state: CameraEngineState;
  actions: CameraEngineActions;
  refs: CameraEngineRefs;
}

export function useCameraEngine(
  activeGame: GameTab,
  enabled: boolean,
  onThrow: (event: AutoThrowEvent) => void,
): UseCameraEngineReturn {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStatus, setCameraStatus] = useState("Camera idle");
  const [boardCenterX, setBoardCenterX] = useState(0.5);
  const [boardCenterY, setBoardCenterY] = useState(0.42);
  const [boardRadius, setBoardRadius] = useState(0.36);
  const [boardCalib, setBoardCalib] = useState<BoardCalibration | null>(null);
  const [cvReady, setCvReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastEmitAtRef = useRef(0);
  const gameRef = useRef<GameTab>(activeGame);
  const centerRef = useRef({ x: 0.5, y: 0.42, r: 0.36 });
  const calibRef = useRef<BoardCalibration | null>(null);
  const onThrowRef = useRef(onThrow);
  const calibratingRef = useRef(false);
  const accumulatingRef = useRef(false);
  const referenceFrameRef = useRef<Uint8ClampedArray | null>(null);
  const accSamplesRef = useRef<Array<{ cx: number; cy: number; changed: number }>>([]);
  const SETTLE_FRAMES = 3;

  useEffect(() => { gameRef.current = activeGame; }, [activeGame]);
  useEffect(() => { onThrowRef.current = onThrow; }, [onThrow]);
  useEffect(() => {
    centerRef.current = { x: boardCenterX, y: boardCenterY, r: boardRadius };
  }, [boardCenterX, boardCenterY, boardRadius]);
  useEffect(() => { calibRef.current = boardCalib; }, [boardCalib]);

  const sampleFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const w = 320;
    const h = 180;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, gi = 0; i < pixels.length; i += 4, gi += 1) {
      gray[gi] = (pixels[i] * 30 + pixels[i + 1] * 59 + pixels[i + 2] * 11) / 100;
    }

    const prev = prevFrameRef.current;
    prevFrameRef.current = gray;
    if (!prev) return;

    // Helper: diff a frame against a reference and return motion stats
    const diffFrames = (cur: Uint8ClampedArray, ref: Uint8ClampedArray) => {
      let changed = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0;
      for (let i = 0; i < cur.length; i++) {
        const diff = Math.abs(cur[i] - ref[i]);
        if (diff < 30) continue;
        const x = i % w;
        const y = Math.floor(i / w);
        if (x < 20 || x > w - 20 || y < 20 || y > h - 20) continue;
        changed++;
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumYY += y * y;
      }
      if (changed === 0) return null;
      const meanX = sumX / changed;
      const meanY = sumY / changed;
      const varX = sumXX / changed - meanX * meanX;
      const varY = sumYY / changed - meanY * meanY;
      const spread = Math.sqrt(varX + varY);
      return { changed, meanX, meanY, spread };
    };

    // --- Settling mode: accumulate samples against pre-dart reference ---
    if (accumulatingRef.current) {
      const ref = referenceFrameRef.current!;
      const stats = diffFrames(gray, ref);

      // If change vanished or exploded (hand entered), abort
      if (!stats || stats.changed < 50 || stats.changed > 5000 || stats.spread > 60) {
        accumulatingRef.current = false;
        accSamplesRef.current = [];
        return;
      }

      accSamplesRef.current.push({ cx: stats.meanX, cy: stats.meanY, changed: stats.changed });

      if (accSamplesRef.current.length >= SETTLE_FRAMES) {
        // Weighted average centroid across all settled frames
        let totalW = 0, avgX = 0, avgY = 0, totalChanged = 0;
        for (const s of accSamplesRef.current) {
          avgX += s.cx * s.changed;
          avgY += s.cy * s.changed;
          totalW += s.changed;
          totalChanged += s.changed;
        }
        avgX /= totalW;
        avgY /= totalW;

        accumulatingRef.current = false;
        accSamplesRef.current = [];
        lastEmitAtRef.current = Date.now();

        const c = centerRef.current;
        const hit = detectHitFromPoint(
          avgX, avgY, w, h, c.x, c.y, c.r,
          calibRef.current ?? undefined,
        );
        const avgChanged = totalChanged / SETTLE_FRAMES;
        const confidence = Math.min(0.99, Math.max(hit.confidence, avgChanged / 4200));
        const resolved: DetectedHit = { ...hit, confidence };

        onThrowRef.current({ id: Date.now(), game: gameRef.current, hit: resolved });
        setCameraStatus(`Detected ${hitLabel(resolved)} (${Math.round(confidence * 100)}%)`);
      }
      return;
    }

    // --- Normal mode: detect initial motion to start settling ---
    const stats = diffFrames(gray, prev);
    if (!stats || stats.changed < 100 || stats.changed > 5000 || stats.spread > 60) return;
    if (Date.now() - lastEmitAtRef.current < 650) return;

    // Motion detected — start settling against the pre-dart frame
    accumulatingRef.current = true;
    referenceFrameRef.current = prev;
    accSamplesRef.current = [{ cx: stats.meanX, cy: stats.meanY, changed: stats.changed }];
  }, []);

  const stopCamera = useCallback(() => {
    if (detectRef.current) {
      clearInterval(detectRef.current);
      detectRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    prevFrameRef.current = null;
    setCameraOn(false);
    setCameraStatus("Camera stopped");
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      prevFrameRef.current = null;
      setCameraOn(true);
      setCameraStatus("Camera on — tap Auto-Calibrate to align");
      detectRef.current = setInterval(sampleFrame, CAMERA_SAMPLE_MS);
    } catch (e) {
      stopCamera();
      setCameraError("Camera access failed. Use HTTPS and allow camera permission.");
      console.error(e);
    }
  }, [sampleFrame, stopCamera]);

  const autoCalibrate = useCallback(async () => {
    if (calibratingRef.current) return;
    calibratingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        setCameraStatus("Need live camera feed before calibration");
        return;
      }

      // Load OpenCV worker lazily on first calibrate
      if (!isReady()) {
        setCameraStatus("Loading OpenCV (first time)...");
        try {
          await loadOpenCV();
          setCvReady(true);
          setCameraStatus("OpenCV ready — calibrating...");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          setCameraStatus("OpenCV failed: " + msg);
          return;
        }
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const w = 320;
      const h = 180;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      setCameraStatus("Calibrating...");

      // All detection runs in the Web Worker — no main thread blocking
      const result = await detectBoardAsync(imageData);

      if (!result) {
        setCameraStatus("Board not detected — adjust camera or lighting");
        return;
      }

      setBoardCenterX(result.cx);
      setBoardCenterY(result.cy);
      setBoardRadius(Math.max(0.25, Math.min(0.48, result.rx)));
      setBoardCalib(result);

      const aspect = Math.min(result.rx, result.ry) / Math.max(result.rx, result.ry);
      const tiltPct = Math.round((1 - aspect) * 100);
      const rotDeg = Math.round((result.rotation * 180) / Math.PI);
      const parts: string[] = ["Aligned"];
      if (tiltPct > 8) parts.push(`tilt ${tiltPct}%`);
      if (Math.abs(rotDeg) > 2) parts.push(`rot ${rotDeg}\u00B0`);
      setCameraStatus(parts.join(" \u00B7 "));
    } finally {
      calibratingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (enabled) startCamera();
    else stopCamera();
  }, [enabled, startCamera, stopCamera]);

  return {
    state: { cameraOn, cameraError, cameraStatus, boardCenterX, boardCenterY, boardRadius, boardCalib, cvReady },
    actions: { startCamera, stopCamera, autoCalibrate, setBoardRadius },
    refs: { videoRef, canvasRef },
  };
}
