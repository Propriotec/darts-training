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
    const h = 240;
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

    let changed = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumYY = 0;
    for (let i = 0; i < gray.length; i += 1) {
      const diff = Math.abs(gray[i] - prev[i]);
      if (diff < 30) continue;
      const x = i % w;
      const y = Math.floor(i / w);
      if (x < 20 || x > w - 20 || y < 20 || y > h - 20) continue;
      changed += 1;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumYY += y * y;
    }

    // Too few changed pixels — no dart detected (lowered to catch thin darts)
    if (changed < 100) return;
    // Too many changed pixels — likely a hand or large movement, not a dart
    if (changed > 5000) return;

    // Spatial compactness: darts create a tight cluster of changed pixels,
    // hands create a wide spread across the frame. Reject diffuse changes.
    const meanX = sumX / changed;
    const meanY = sumY / changed;
    const varX = sumXX / changed - meanX * meanX;
    const varY = sumYY / changed - meanY * meanY;
    const spread = Math.sqrt(varX + varY);
    if (spread > 60) return;

    if (Date.now() - lastEmitAtRef.current < 650) return;
    lastEmitAtRef.current = Date.now();

    const cx = meanX;
    const cy = meanY;
    const c = centerRef.current;
    const hit = detectHitFromPoint(
      cx, cy, w, h, c.x, c.y, c.r,
      calibRef.current ?? undefined,
    );
    const confidence = Math.min(0.99, Math.max(hit.confidence, changed / 4200));
    const resolved: DetectedHit = { ...hit, confidence };

    onThrowRef.current({ id: Date.now(), game: gameRef.current, hit: resolved });
    setCameraStatus(`Detected ${hitLabel(resolved)} (${Math.round(confidence * 100)}%)`);
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
      const h = 240;
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
