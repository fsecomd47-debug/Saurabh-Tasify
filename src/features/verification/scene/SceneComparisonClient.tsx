"use client";

/**
 * PDR-4.2 §41-43: SceneComparisonClient
 * Before/after photo capture for visual_result missions (e.g., "Clean my desk").
 * Captures before photo, allows user to perform task, captures after photo.
 * Performs local scene comparison to detect meaningful changes.
 * §53: Sends only derived signals to the server vision route.
 */

import React, { useState, useRef, useCallback } from "react";
import { Camera, CheckCircle2, ArrowRight, RotateCcw, AlertCircle } from "lucide-react";

type SceneComparisonState = "before" | "task" | "after" | "comparing" | "result";

type SceneComparisonResult = {
  changed: boolean;
  changeScore: number;
  regionChangeScore: number;
  message: string;
};

type SceneComparisonClientProps = {
  missionId?: string;
  missionTitle?: string;
  onComplete: (result: { confidence: number; metadata: Record<string, unknown> }) => void;
  onCancel: () => void;
};

/**
 * §42: Grid-based histogram similarity — divides images into regions
 * and computes per-region color histograms for robust comparison
 * that tolerates minor camera shifts.
 */
function computeGridHistogramChange(
  beforeCtx: CanvasRenderingContext2D,
  afterCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number = 4
): { changeScore: number; regionChangeScore: number } {
  const cellW = Math.floor(width / gridSize);
  const cellH = Math.floor(height / gridSize);
  const bins = 16;
  let totalChange = 0;
  let maxRegionChange = 0;
  let regionCount = 0;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x0 = gx * cellW;
      const y0 = gy * cellH;

      const beforeData = beforeCtx.getImageData(x0, y0, cellW, cellH).data;
      const afterData = afterCtx.getImageData(x0, y0, cellW, cellH).data;

      const beforeHist = new Float32Array(bins);
      const afterHist = new Float32Array(bins);
      const pixelCount = cellW * cellH;

      for (let i = 0; i < beforeData.length; i += 4) {
        const luminance = (0.299 * beforeData[i] + 0.587 * beforeData[i + 1] + 0.114 * beforeData[i + 2]) / 255;
        beforeHist[Math.min(bins - 1, Math.floor(luminance * (bins - 1)))]++;
        const luminance2 = (0.299 * afterData[i] + 0.587 * afterData[i + 1] + 0.114 * afterData[i + 2]) / 255;
        afterHist[Math.min(bins - 1, Math.floor(luminance2 * (bins - 1)))]++;
      }

      // Normalize
      for (let b = 0; b < bins; b++) {
        beforeHist[b] /= pixelCount;
        afterHist[b] /= pixelCount;
      }

      // Intersection similarity per region
      let intersection = 0;
      for (let b = 0; b < bins; b++) {
        intersection += Math.min(beforeHist[b], afterHist[b]);
      }
      const regionChange = 1 - intersection;
      totalChange += regionChange;
      maxRegionChange = Math.max(maxRegionChange, regionChange);
      regionCount++;
    }
  }

  return {
    changeScore: regionCount > 0 ? totalChange / regionCount : 0,
    regionChangeScore: maxRegionChange,
  };
}

/**
 * §42: Edge-based region change detection for structural changes.
 * Focuses on the center 60% of the image (task area).
 */
function computeRegionEdgeChange(
  beforeCtx: CanvasRenderingContext2D,
  afterCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  // Focus on center region (task area)
  const marginX = Math.floor(width * 0.2);
  const marginY = Math.floor(height * 0.15);
  const regionW = width - marginX * 2;
  const regionH = height - marginY * 2;

  let edgeDiffSum = 0;
  let edgeCount = 0;
  const step = 6; // Sample every 6th pixel for speed

  for (let y = marginY + 1; y < marginY + regionH - 1; y += step) {
    for (let x = marginX + 1; x < marginX + regionW - 1; x += step) {
      const idx = (y * width + x) * 4;

      // Before edges
      const bLeft = beforeCtx.getImageData(x - 1, y, 1, 1).data[0];
      const bRight = beforeCtx.getImageData(x + 1, y, 1, 1).data[0];
      const bTop = beforeCtx.getImageData(x, y - 1, 1, 1).data[0];
      const bBottom = beforeCtx.getImageData(x, y + 1, 1, 1).data[0];
      const bEdge = Math.abs(bRight - bLeft) + Math.abs(bBottom - bTop);

      // After edges
      const aLeft = afterCtx.getImageData(x - 1, y, 1, 1).data[0];
      const aRight = afterCtx.getImageData(x + 1, y, 1, 1).data[0];
      const aTop = afterCtx.getImageData(x, y - 1, 1, 1).data[0];
      const aBottom = afterCtx.getImageData(x, y + 1, 1, 1).data[0];
      const aEdge = Math.abs(aRight - aLeft) + Math.abs(aBottom - aTop);

      edgeDiffSum += Math.abs(bEdge - aEdge);
      edgeCount++;
    }
  }

  return edgeCount > 0 ? edgeDiffSum / (edgeCount * 255) : 0;
}

export function SceneComparisonClient({ missionTitle, onComplete, onCancel }: SceneComparisonClientProps) {
  const [state, setState] = useState<SceneComparisonState>("before");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [result, setResult] = useState<SceneComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera access is required for photo verification.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const handleCapture = useCallback(async () => {
    const photo = capturePhoto();
    if (!photo) {
      setError("Failed to capture photo.");
      return;
    }

    if (state === "before") {
      setBeforeImage(photo);
      setState("task");
      stopCamera();
    } else if (state === "after") {
      setAfterImage(photo);
      setState("comparing");
      stopCamera();

      // Compare images using grid histogram + edge analysis
      try {
        const beforeImg = new Image();
        const afterImg = new Image();

        const beforeSrc = beforeImage!;
        const afterSrc = photo;

        await Promise.all([
          new Promise<void>((resolve) => {
            beforeImg.onload = () => resolve();
            beforeImg.src = beforeSrc;
          }),
          new Promise<void>((resolve) => {
            afterImg.onload = () => resolve();
            afterImg.src = afterSrc;
          }),
        ]);

        const offscreen = document.createElement("canvas");
        const w = 160;
        const h = 120;
        offscreen.width = w;
        offscreen.height = h;
        const offCtx = offscreen.getContext("2d", { willReadFrequently: true })!;

        // Draw before image
        offCtx.drawImage(beforeImg, 0, 0, w, h);
        const beforeCtx = offscreen.getContext("2d", { willReadFrequently: true })!;

        // Draw after image on a second canvas
        const offscreen2 = document.createElement("canvas");
        offscreen2.width = w;
        offscreen2.height = h;
        const offCtx2 = offscreen2.getContext("2d", { willReadFrequently: true })!;
        offCtx2.drawImage(afterImg, 0, 0, w, h);

        // Grid histogram comparison (§42)
        const histogramResult = computeGridHistogramChange(offCtx, offCtx2, w, h, 4);

        // Edge-based region change
        const edgeChange = computeRegionEdgeChange(offCtx, offCtx2, w, h);

        // Combine signals: weighted average of histogram and edge change
        const changeScore = Math.min(1, histogramResult.changeScore * 0.6 + edgeChange * 0.4);
        const regionChangeScore = Math.min(1, histogramResult.regionChangeScore * 0.5 + edgeChange * 0.5);

        // §41: Meaningful change threshold — cleaning tasks show moderate,
        // region-focused change. Zero change = nothing happened.
        // Near-total change usually means camera moved, not task completed.
        const changed = changeScore >= 0.03 && changeScore <= 0.92 && regionChangeScore >= 0.04;

        setResult({
          changed,
          changeScore,
          regionChangeScore,
          message: changed
            ? "Good changes detected! Task appears completed."
            : changeScore < 0.03
              ? "No meaningful changes detected. Try completing the task first."
              : "The scene changed too much — the camera may have moved. Try keeping the camera steady.",
        });
        setState("result");
      } catch {
        setResult({
          changed: false,
          changeScore: 0,
          regionChangeScore: 0,
          message: "Could not compare images. Please try again.",
        });
        setState("result");
      }
    }
  }, [state, capturePhoto, stopCamera, beforeImage]);

  const handleStartTask = useCallback(() => {
    setState("after");
    startCamera();
  }, [startCamera]);

  const handleRetake = useCallback(() => {
    setBeforeImage(null);
    setAfterImage(null);
    setResult(null);
    setState("before");
    startCamera();
  }, [startCamera]);

  const handleContinue = useCallback(() => {
    if (!result) return;

    // §53: Send only derived signals, never raw photos to server.
    // The server's deriveVisionVerdict processes changeScore + regionChangeScore.
    onComplete({
      confidence: result.changed ? 0.8 : 0.35,
      metadata: {
        sceneChanged: result.changed,
        changeScore: result.changeScore,
        regionChangeScore: result.regionChangeScore,
        useVisionRoute: true,
        summary: {
          changeScore: result.changeScore,
          regionChangeScore: result.regionChangeScore,
        },
      },
    });
  }, [result, onComplete]);

  React.useEffect(() => {
    if (state === "before" || state === "after") {
      startCamera();
    }
    return () => stopCamera();
  }, [state, startCamera, stopCamera]);

  return (
    <div className="bg-white rounded-[24px] p-6 space-y-5" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
      <canvas ref={canvasRef} className="hidden" />

      {state === "before" && (
        <div className="space-y-4">
          <div className="text-center">
            <Camera className="w-10 h-10 text-[#5E5CE6] mx-auto mb-3" />
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">Before Photo</h2>
            <p className="text-[13px] text-[#8E8E93] mt-1">Take a photo of the current state</p>
          </div>
          <div className="relative aspect-[4/3] bg-black rounded-[16px] overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          </div>
          <button
            onClick={handleCapture}
            className="w-full h-12 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[15px] active:scale-[0.98]"
          >
            Capture Before
          </button>
        </div>
      )}

      {state === "task" && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto" />
          <h2 className="text-[18px] font-bold text-[#1C1C1E]">Complete Your Task</h2>
          <p className="text-[13px] text-[#8E8E93]">
            Go ahead and complete your task. When you&apos;re done, take an &quot;after&quot; photo.
          </p>
          {beforeImage && (
            <img src={beforeImage} alt="Before" className="w-32 h-24 object-cover rounded-[12px] mx-auto" />
          )}
          <button
            onClick={handleStartTask}
            className="w-full h-12 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[15px] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Done — Take After Photo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {state === "after" && (
        <div className="space-y-4">
          <div className="text-center">
            <Camera className="w-10 h-10 text-[#5E5CE6] mx-auto mb-3" />
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">After Photo</h2>
            <p className="text-[13px] text-[#8E8E93] mt-1">Capture the result of your work</p>
          </div>
          <div className="relative aspect-[4/3] bg-black rounded-[16px] overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          </div>
          <button
            onClick={handleCapture}
            className="w-full h-12 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[15px] active:scale-[0.98]"
          >
            Capture After
          </button>
        </div>
      )}

      {state === "comparing" && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-[3px] border-[#5E5CE6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[16px] font-bold text-[#1C1C1E]">Comparing photos...</p>
          <p className="text-[13px] text-[#8E8E93] mt-1">Analyzing scene changes</p>
        </div>
      )}

      {state === "result" && result && (
        <div className="space-y-4">
          <div className="text-center">
            {result.changed ? (
              <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto mb-3" />
            ) : (
              <AlertCircle className="w-10 h-10 text-[#FF9500] mx-auto mb-3" />
            )}
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">
              {result.changed ? "Changes Detected!" : "No Clear Changes"}
            </h2>
            <p className="text-[13px] text-[#8E8E93] mt-1">{result.message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 h-11 rounded-[12px] bg-[#F2F2F7] text-[#1C1C1E] font-semibold text-[14px] active:scale-[0.98]"
            >
              Retake
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 h-11 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[14px] active:scale-[0.98]"
            >
              {result.changed ? "Submit" : "Continue Anyway"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center">
          <p className="text-[13px] text-[#FF3B30]">{error}</p>
          <button onClick={onCancel} className="mt-3 text-[13px] text-[#5E5CE6] font-semibold">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
