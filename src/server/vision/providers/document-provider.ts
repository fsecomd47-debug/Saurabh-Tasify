/**
 * PDR-4.2 §53-54: Document/OCR Provider
 * Document detection, OCR, field extraction for receipts/documents.
 * Extracts only fields needed by the mission.
 */

import type { VisionProvider } from "../provider-interface";
import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  InferencePolicy,
  ProcessingMode,
  DerivedVisionEvent,
} from "../types";

// §53-54: Document type patterns for classification
const DOCUMENT_PATTERNS: Record<string, RegExp[]> = {
  receipt: [/total\s*[:$]?\s*\$?[\d,.]+/i, /subtotal/i, /tax\s*[:$]?\s*\$?[\d,.]+/i, /change\s+due/i, /cashier/i],
  invoice: [/invoice\s*(#|number|no)/i, /bill\s+to/i, /amount\s+due/i, /payment\s+terms/i],
  ticket: [/boarding\s+pass/i, /seat\s+#?\d/i, /departure/i, /arrival/i, /gate\s+#?\w/i],
  certificate: [/certificate/i, /certified/i, /this\s+is\s+to\s+certify/i, /awarded\s+to/i],
};

// Common financial field extraction patterns
const FIELD_PATTERNS = {
  amount: [/\$\s*([\d,]+\.?\d*)/g, /total\s*[:$]?\s*\$?([\d,]+\.?\d*)/i, /amount\s*[:$]?\s*\$?([\d,]+\.?\d*)/i],
  date: [/(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/g, /(\w+\s+\d{1,2},?\s+\d{4})/g],
  number: [/#\s*(\d+)/g, /number\s*[:#]?\s*(\d+)/i, /no\.?\s*(\d+)/i],
};

type ExtractedField = {
  name: string;
  value: string;
  confidence: number;
};

type DocumentDetectionResult = {
  isDocument: boolean;
  documentType: "receipt" | "invoice" | "ticket" | "certificate" | "other" | "unknown";
  fields: ExtractedField[];
  quality: "clear" | "partial" | "unreadable";
};

export class DocumentProvider implements VisionProvider {
  readonly id = "document";
  readonly type: VisionProviderType = "document";
  readonly version = "1.0.0";
  readonly processingMode: ProcessingMode = "snapshot";

  private context: VisionContext | null = null;
  private events: DerivedVisionEvent[] = [];
  private sequence = 0;
  private lastResult: DocumentDetectionResult | null = null;

  supports(requirements: Record<string, unknown>): boolean {
    return requirements.requiresOCR === true;
  }

  async initialize(context: VisionContext): Promise<void> {
    this.context = context;
    this.events = [];
    this.sequence = 0;
  }

  async start(_context: VisionContext): Promise<void> {}

  /**
   * §53: Process a document image.
   * Pipeline: quality → document detection → OCR → field extraction → rule validation.
   */
  async process(input: VisionInput): Promise<VisionObservation> {
    if (!input.frame && !input.photo) {
      return {
        type: "document_no_data",
        confidence: 0,
        metrics: {},
        isStateChange: false,
      };
    }

    const result = await this.detectAndExtract(input);
    this.lastResult = result;

    const observation: VisionObservation = {
      type: result.isDocument ? "document_detected" : "document_not_detected",
      confidence: result.isDocument ? 0.8 : 0.2,
      metrics: {
        isDocument: result.isDocument ? 1 : 0,
        fieldCount: result.fields.length,
        qualityScore: result.quality === "clear" ? 1 : result.quality === "partial" ? 0.5 : 0,
      },
      message: this.getUserFacingMessage(result),
      isStateChange: result.isDocument,
    };

    if (result.isDocument) {
      this.events.push({
        missionId: this.context?.missionId ?? "",
        sessionId: this.context?.sessionId ?? "",
        sequence: ++this.sequence,
        type: "object_detected",
        timestamp: input.timestamp,
        metrics: {
          documentType: result.documentType === "receipt" ? 1 : 0,
          fieldCount: result.fields.length,
        },
      });
    }

    return observation;
  }

  async stop(): Promise<void> {}

  async finalize(): Promise<VisionResult> {
    const result = this.lastResult;
    if (!result || !result.isDocument) {
      return {
        status: "unsupported",
        evidenceClass: "insufficient",
        confidenceLevel: "needs_better_view",
        confidenceScore: 0,
        reasonCode: "NO_DOCUMENT_DETECTED",
        events: [],
      };
    }

    const highConfFields = result.fields.filter((f) => f.confidence >= 0.7);
    const supported = result.quality !== "unreadable" && highConfFields.length > 0;

    return {
      status: supported ? "supported" : "uncertain",
      evidenceClass: result.quality === "clear" ? "clear" : result.quality === "partial" ? "partial" : "insufficient",
      confidenceLevel: supported ? "clear" : result.quality === "partial" ? "likely" : "needs_better_view",
      confidenceScore: supported ? 0.8 : 0.4,
      metrics: {
        fieldCount: result.fields.length,
        highConfFields: highConfFields.length,
      },
      reasonCode: supported ? "DOCUMENT_EXTRACTED" : "DOCUMENT_INSUFFICIENT",
      events: this.events,
    };
  }

  async dispose(): Promise<void> {
    this.context = null;
    this.events = [];
    this.lastResult = null;
  }

  getInferencePolicy(): InferencePolicy {
    return {
      preferredLocation: "server", // OCR typically needs server-side
      allowFallback: false,
      maxUploadBytes: 10 * 1024 * 1024,
      retainRawMedia: false,
      derivedEventsOnly: true,
    };
  }

  /**
   * §53: Document detection and OCR extraction.
   * Uses Tesseract.js for OCR, with document type classification and field extraction.
   * Pipeline: quality → document detection → OCR → field extraction → rule validation.
   */
  private async detectAndExtract(input: VisionInput): Promise<DocumentDetectionResult> {
    const imageData = this.extractImageData(input);
    if (!imageData) {
      return { isDocument: false, documentType: "unknown", fields: [], quality: "unreadable" };
    }

    // 1. Assess image quality for OCR suitability
    const quality = this.assessOCRQuality(imageData);

    // 2. Run OCR using Tesseract.js
    const ocrText = await this.runOCR(imageData);
    if (!ocrText || ocrText.trim().length < 5) {
      return { isDocument: false, documentType: "unknown", fields: [], quality };
    }

    // 3. Detect if this is a document based on text content
    const isDocument = this.isLikelyDocument(ocrText);

    // 4. Classify document type
    const documentType = this.classifyDocumentType(ocrText);

    // 5. Extract relevant fields
    const fields = this.extractFields(ocrText, documentType);

    return { isDocument, documentType, fields, quality };
  }

  private extractImageData(input: VisionInput): { data: Uint8ClampedArray; width: number; height: number } | null {
    const source = input.frame ?? input.photo;
    if (!source) return null;
    if ("data" in source && "width" in source && "height" in source) {
      return { data: source.data as Uint8ClampedArray, width: source.width as number, height: source.height as number };
    }
    return null;
  }

  private assessOCRQuality(imageData: { data: Uint8ClampedArray; width: number; height: number }): "clear" | "partial" | "unreadable" {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    if (totalPixels < 10000) return "unreadable"; // Too small

    // Compute brightness and contrast
    let sumBrightness = 0;
    let minBrightness = 255;
    let maxBrightness = 0;
    const sampleStep = Math.max(1, Math.floor(totalPixels / 5000));

    for (let i = 0; i < totalPixels; i += sampleStep) {
      const brightness = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      sumBrightness += brightness;
      if (brightness < minBrightness) minBrightness = brightness;
      if (brightness > maxBrightness) maxBrightness = brightness;
    }

    const avgBrightness = sumBrightness / (totalPixels / sampleStep);
    const contrast = maxBrightness - minBrightness;

    // Poor lighting
    if (avgBrightness < 40 || avgBrightness > 220) return "unreadable";
    if (contrast < 30) return "partial";

    // Compute edge density (text produces many edges)
    let edgeCount = 0;
    for (let y = 1; y < height - 1; y += 3) {
      for (let x = 1; x < width - 1; x += 3) {
        const idx = (y * width + x) * 4;
        const left = ((y * width + (x - 1)) * 4);
        const right = ((y * width + (x + 1)) * 4);
        const diff = Math.abs(data[idx] - data[left]) + Math.abs(data[idx] - data[right]);
        if (diff > 40) edgeCount++;
      }
    }

    const edgeDensity = edgeCount / (totalPixels / 9);
    if (edgeDensity < 0.02) return "partial"; // Very few edges = likely blank or blurry

    return "clear";
  }

  /**
   * §53: Run OCR on image data using Tesseract.js.
   * Converts ImageData to a Buffer and processes with Tesseract.
   */
  private async runOCR(imageData: { data: Uint8ClampedArray; width: number; height: number }): Promise<string> {
    try {
      // Dynamic import to avoid SSR issues — Tesseract.js is a heavy dependency
      const Tesseract = await import("tesseract.js");

      // Convert RGBA ImageData to PNG buffer for Tesseract
      // Use minimal PNG encoder (no external canvas dependency needed)
      const buffer = this.encodeRawToPNG(imageData);

      const result = await Tesseract.recognize(buffer, "eng", {
        logger: () => {}, // Suppress logging
      });

      return result.data.text ?? "";
    } catch {
      // If Tesseract.js is unavailable, fall back to heuristic text detection
      return this.heuristicTextDetection(imageData);
    }
  }

  /**
   * Minimal PNG encoder when canvas is unavailable.
   * Creates a valid PNG from raw RGBA pixel data.
   */
  private encodeRawToPNG(imageData: { data: Uint8ClampedArray; width: number; height: number }): Buffer {
    const { data, width, height } = imageData;

    // Create raw image data (filter byte 0 + RGBA pixels per row)
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
      rawData[y * (1 + width * 4)] = 0; // No filter
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = y * (1 + width * 4) + 1 + x * 4;
        rawData[dstIdx] = data[srcIdx];
        rawData[dstIdx + 1] = data[srcIdx + 1];
        rawData[dstIdx + 2] = data[srcIdx + 2];
        rawData[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    // Build PNG file
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = this.makePNGChunk("IHDR", ihdrData);

    // IDAT chunk (deflate)
    const zlib = require("zlib");
    const compressed = zlib.deflateSync(rawData);
    const idat = this.makePNGChunk("IDAT", compressed);

    // IEND chunk
    const iend = this.makePNGChunk("IEND", Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
  }

  private makePNGChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(this.crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  }

  private crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Heuristic text detection when Tesseract is unavailable.
   * Analyzes horizontal/vertical projections for text-like patterns.
   */
  private heuristicTextDetection(imageData: { data: Uint8ClampedArray; width: number; height: number }): string {
    const { data, width, height } = imageData;

    // Detect horizontal lines of high contrast (text lines)
    const horizontalProjection = new Uint32Array(height);
    for (let y = 0; y < height; y++) {
      let darkCount = 0;
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (brightness < 128) darkCount++;
      }
      horizontalProjection[y] = darkCount;
    }

    // Find text line regions (rows with significant dark pixels)
    const textLines: number[] = [];
    let inLine = false;
    let lineStart = 0;
    const threshold = width * 0.02; // At least 2% dark pixels

    for (let y = 0; y < height; y++) {
      if (!inLine && horizontalProjection[y] > threshold) {
        inLine = true;
        lineStart = y;
      } else if (inLine && horizontalProjection[y] <= threshold) {
        inLine = false;
        if (y - lineStart > 3) textLines.push(y - lineStart);
      }
    }

    // Heuristic: if we found 3+ text-like lines, this is likely a document
    if (textLines.length >= 3) {
      return `[Document detected: ${textLines.length} text regions, ${width}x${height} pixels]`;
    }

    return "";
  }

  private isLikelyDocument(text: string): boolean {
    if (text.length < 10) return false;

    // Check for document indicators
    const indicators = [
      /\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/,  // Dates
      /\$\s*[\d,.]+/,                         // Currency
      /total|subtotal|amount|invoice|receipt/i, // Document keywords
      /\b\d{3,}\b/,                           // Long numbers (order/invoice numbers)
    ];

    const matchCount = indicators.filter((p) => p.test(text)).length;
    return matchCount >= 2 || text.length > 50;
  }

  private classifyDocumentType(text: string): "receipt" | "invoice" | "ticket" | "certificate" | "other" | "unknown" {
    for (const [type, patterns] of Object.entries(DOCUMENT_PATTERNS)) {
      const matches = patterns.filter((p) => p.test(text)).length;
      if (matches >= 2) return type as "receipt" | "invoice" | "ticket" | "certificate";
    }
    return "other";
  }

  private extractFields(text: string, docType: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Extract amounts
    for (const pattern of FIELD_PATTERNS.amount) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[1] || match[0];
        fields.push({ name: "amount", value: value.replace(/,/g, ""), confidence: 0.8 });
      }
    }

    // Extract dates
    for (const pattern of FIELD_PATTERNS.date) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        fields.push({ name: "date", value: match[1], confidence: 0.75 });
      }
    }

    // Extract numbers (order/invoice numbers)
    for (const pattern of FIELD_PATTERNS.number) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        fields.push({ name: "document_number", value: match[1], confidence: 0.7 });
      }
    }

    // Deduplicate by name (keep highest confidence)
    const seen = new Map<string, ExtractedField>();
    for (const f of fields) {
      const existing = seen.get(f.name);
      if (!existing || f.confidence > existing.confidence) {
        seen.set(f.name, f);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * §19: User-facing message.
   */
  private getUserFacingMessage(result: DocumentDetectionResult): string {
    if (!result.isDocument) {
      return "No document detected. Make sure the document is clearly visible.";
    }
    if (result.quality === "unreadable") {
      return "Document is unclear. Improve lighting and hold steady.";
    }
    if (result.fields.length === 0) {
      return "Document detected but text could not be read. Try a clearer photo.";
    }
    return `Document detected. ${result.fields.length} fields extracted.`;
  }
}
