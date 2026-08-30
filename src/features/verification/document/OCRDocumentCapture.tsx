"use client";

/**
 * PDR-4.2 §44-45: OCRDocumentCapture
 * Document/OCR evidence capture for missions requiring text extraction.
 * Captures photo of document, performs client-side OCR via Tesseract.js,
 * extracts structured fields for verification.
 * §53: Sends only derived signals (textLength, fieldCount) to the server vision route.
 */

import React, { useState, useRef, useCallback } from "react";
import { FileText, Camera, CheckCircle2, AlertCircle } from "lucide-react";

type OCRState = "capture" | "processing" | "result" | "error";

type OCRResult = {
  text: string;
  fields: Record<string, string>;
  confidence: number;
  quality: "good" | "acceptable" | "poor";
  message: string;
};

type OCRDocumentCaptureProps = {
  missionTitle: string;
  onComplete: (result: { confidence: number; metadata: Record<string, unknown> }) => void;
  onCancel: () => void;
};

/**
 * Extract structured fields from OCR text.
 * Looks for common document patterns: dates, amounts, names, etc.
 */
function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/gi,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.date = match[0];
      break;
    }
  }

  // Currency patterns
  const currencyMatch = text.match(/[\$\€\£]\s*[\d,]+\.?\d*/g);
  if (currencyMatch) {
    fields.amount = currencyMatch[0];
  }

  // Number patterns (standalone)
  const numberMatch = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g);
  if (numberMatch && numberMatch.length > 0) {
    fields.numbers = numberMatch.join(", ");
  }

  // Email pattern
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatch) {
    fields.email = emailMatch[0];
  }

  // Phone pattern
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (phoneMatch) {
    fields.phone = phoneMatch[0];
  }

  // Line count as proxy for document completeness
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  fields.lineCount = String(lines.length);

  return fields;
}

/**
 * Assess OCR text quality.
 */
function assessQuality(text: string): OCRResult["quality"] {
  const hasContent = text.trim().length > 20;
  const hasStructure = text.split("\n").length > 3;
  const hasNumbers = /\d/.test(text);

  if (hasContent && hasStructure && hasNumbers) return "good";
  if (hasContent && hasStructure) return "acceptable";
  return "poor";
}

export function OCRDocumentCapture({ missionTitle, onComplete, onCancel }: OCRDocumentCaptureProps) {
  const [state, setState] = useState<OCRState>("capture");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
      setError("Camera access is required for document capture.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(imageData);
    stopCamera();
    setState("processing");

    try {
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(imageData, "eng", {
        logger: () => {},
      });

      const text = data.text;
      const fields = extractFields(text);
      const quality = assessQuality(text);
      const confidence = data.confidence / 100;

      setResult({
        text: text.substring(0, 2000),
        fields,
        confidence,
        quality,
        message:
          quality === "good"
            ? "Document captured successfully with clear text."
            : quality === "acceptable"
              ? "Document captured but some text may be unclear."
              : "Document quality is poor. Please retake with better lighting.",
      });
      setState("result");
    } catch {
      setError("Failed to process document. Please try again.");
      setState("error");
    }
  }, [stopCamera]);

  const handleContinue = useCallback(() => {
    if (!result) return;

    const qualityMultiplier = result.quality === "good" ? 1 : result.quality === "acceptable" ? 0.8 : 0.5;
    const confidence = result.confidence * qualityMultiplier;

    // §53: Send only derived signals to the server vision route.
    // Server uses textLength + fieldCount for document confidence.
    onComplete({
      confidence: Math.max(0.3, confidence),
      metadata: {
        ocrText: result.text,
        extractedFields: result.fields,
        quality: result.quality,
        ocrConfidence: result.confidence,
        useVisionRoute: true,
        summary: {
          textLength: result.text.length,
          fieldCount: Object.keys(result.fields).length,
        },
      },
    });
  }, [result, onComplete]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setState("capture");
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    if (state === "capture") {
      startCamera();
    }
    return () => stopCamera();
  }, [state, startCamera, stopCamera]);

  return (
    <div className="bg-white rounded-[24px] p-6 space-y-5" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
      <canvas ref={canvasRef} className="hidden" />

      {state === "capture" && (
        <div className="space-y-4">
          <div className="text-center">
            <FileText className="w-10 h-10 text-[#5E5CE6] mx-auto mb-3" />
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">Capture Document</h2>
            <p className="text-[13px] text-[#8E8E93] mt-1">
              Take a clear photo of the document for: {missionTitle}
            </p>
          </div>
          <div className="relative aspect-[4/3] bg-black rounded-[16px] overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          </div>
          <div className="bg-[#F2F2F7] rounded-[12px] p-3">
            <p className="text-[12px] text-[#8E8E93] text-center">
              Tips: Ensure good lighting, hold steady, keep the document fully in frame
            </p>
          </div>
          <button
            onClick={handleCapture}
            className="w-full h-12 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[15px] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" /> Capture Document
          </button>
        </div>
      )}

      {state === "processing" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-12 h-12 border-[3px] border-[#5E5CE6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[16px] font-bold text-[#1C1C1E]">Processing document...</p>
          <p className="text-[13px] text-[#8E8E93]">Extracting text with OCR</p>
          {capturedImage && (
            <img src={capturedImage} alt="Captured" className="w-32 h-24 object-cover rounded-[12px] mx-auto opacity-60" />
          )}
        </div>
      )}

      {state === "result" && result && (
        <div className="space-y-4">
          <div className="text-center">
            {result.quality !== "poor" ? (
              <CheckCircle2 className="w-10 h-10 text-[#34C759] mx-auto mb-3" />
            ) : (
              <AlertCircle className="w-10 h-10 text-[#FF9500] mx-auto mb-3" />
            )}
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">Document Processed</h2>
            <p className="text-[13px] text-[#8E8E93] mt-1">{result.message}</p>
          </div>

          <div className="bg-[#F2F2F7] rounded-[12px] p-4 space-y-2">
            <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">Extracted Fields</p>
            {Object.entries(result.fields).map(([key, value]) => (
              <div key={key} className="flex justify-between text-[13px]">
                <span className="text-[#8E8E93] capitalize">{key}</span>
                <span className="text-[#1C1C1E] font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] pt-1 border-t border-[#E5E5EA]">
              <span className="text-[#8E8E93]">OCR Confidence</span>
              <span className="text-[#1C1C1E] font-medium">{Math.round(result.confidence * 100)}%</span>
            </div>
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
              Submit
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#FF3B30] mx-auto" />
          <p className="text-[14px] text-[#FF3B30]">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 h-11 rounded-[12px] bg-[#5E5CE6] text-white font-semibold text-[14px] active:scale-[0.98]"
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-[12px] bg-[#F2F2F7] text-[#1C1C1E] font-semibold text-[14px] active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
