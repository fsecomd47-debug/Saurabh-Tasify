import { describe, it, expect } from "vitest";
import {
  validateObservationSequence,
  validateObjectCountSignal,
  objectCountConfidence,
  validateSceneChangeSignal,
  sceneChangeConfidence,
  documentSignalPlausible,
  documentConfidence,
  deriveVisionVerdict,
} from "@/server/verification/vision-validation";

/* ── Observation sequence validation (§54) ─────────────────── */

describe("validateObservationSequence", () => {
  it("accepts monotonically increasing timestamps", () => {
    const result = validateObservationSequence([
      { frameIndex: 0, timestamp: 1000 },
      { frameIndex: 1, timestamp: 1100 },
      { frameIndex: 2, timestamp: 1200 },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects timestamp regression", () => {
    const result = validateObservationSequence([
      { frameIndex: 0, timestamp: 1000 },
      { frameIndex: 1, timestamp: -1 }, // >1000ms regression exceeds tolerance
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("TIMESTAMP_REGRESSION");
  });

  it("rejects frame index regression", () => {
    const result = validateObservationSequence([
      { frameIndex: 5, timestamp: 1000 },
      { frameIndex: 3, timestamp: 1100 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("FRAME_INDEX_REGRESSION");
  });

  it("tolerates small clock jitter (within 1s)", () => {
    const result = validateObservationSequence([
      { frameIndex: 0, timestamp: 1000 },
      { frameIndex: 1, timestamp: 999 },
      { frameIndex: 2, timestamp: 998 },
    ]);
    expect(result.ok).toBe(true);
  });

  it("accepts empty array", () => {
    expect(validateObservationSequence([]).ok).toBe(true);
  });
});

/* ── Object counting (§39-40) ───────────────────────────────── */

describe("validateObjectCountSignal", () => {
  it("rejects negative counts", () => {
    const result = validateObjectCountSignal({ objectCount: -1 });
    expect(result.plausible).toBe(false);
  });

  it("rejects unreasonably high counts", () => {
    const result = validateObjectCountSignal({ objectCount: 201 });
    expect(result.plausible).toBe(false);
  });

  it("accepts valid count without expected", () => {
    const result = validateObjectCountSignal({ objectCount: 5 });
    expect(result.plausible).toBe(true);
    expect(result.ratio).toBe(1);
  });

  it("calculates ratio correctly when expected is given", () => {
    const result = validateObjectCountSignal({ objectCount: 5, expectedCount: 5 });
    expect(result.plausible).toBe(true);
    expect(result.ratio).toBe(1);
  });

  it("rejects ratio > 3x as detection noise", () => {
    const result = validateObjectCountSignal({ objectCount: 16, expectedCount: 5 });
    expect(result.plausible).toBe(false);
    expect(result.reasonCode).toBe("OBJECT_COUNT_IMPLAUSIBLE");
  });

  it("accepts partial count (80% of target)", () => {
    const result = validateObjectCountSignal({ objectCount: 4, expectedCount: 5 });
    expect(result.plausible).toBe(true);
    expect(result.ratio).toBe(0.8);
  });
});

describe("objectCountConfidence", () => {
  it("returns 0 for implausible check", () => {
    const check = validateObjectCountSignal({ objectCount: -1 });
    expect(objectCountConfidence(check, 0.8)).toBe(0);
  });

  it("returns high confidence for exact match", () => {
    const check = validateObjectCountSignal({ objectCount: 5, expectedCount: 5 });
    const conf = objectCountConfidence(check, 0.9);
    expect(conf).toBeGreaterThanOrEqual(0.85);
  });

  it("returns partial confidence for undercount", () => {
    const check = validateObjectCountSignal({ objectCount: 3, expectedCount: 5 });
    const conf = objectCountConfidence(check, 0.8);
    expect(conf).toBeGreaterThan(0.3);
    expect(conf).toBeLessThan(0.72);
  });
});

/* ── Scene comparison (§41-43) ───────────────────────────────── */

describe("validateSceneChangeSignal", () => {
  it("rejects out-of-range values", () => {
    const result = validateSceneChangeSignal({ changeScore: 1.5, regionChangeScore: 0.5 });
    expect(result.plausible).toBe(false);
  });

  it("rejects near-total change as camera movement", () => {
    const result = validateSceneChangeSignal({ changeScore: 0.98, regionChangeScore: 0.5 });
    expect(result.plausible).toBe(false);
  });

  it("flags zero change as not meaningful", () => {
    const result = validateSceneChangeSignal({ changeScore: 0, regionChangeScore: 0 });
    expect(result.plausible).toBe(true);
    expect(result.meaningful).toBe(false);
  });

  it("accepts moderate region-focused change", () => {
    const result = validateSceneChangeSignal({ changeScore: 0.25, regionChangeScore: 0.4 });
    expect(result.plausible).toBe(true);
    expect(result.meaningful).toBe(true);
  });
});

describe("sceneChangeConfidence", () => {
  it("returns 0 for implausible", () => {
    const check = validateSceneChangeSignal({ changeScore: 1.5, regionChangeScore: 0.5 });
    const signal = { changeScore: 1.5, regionChangeScore: 0.5 };
    expect(sceneChangeConfidence(check, signal, 0.8)).toBe(0);
  });

  it("returns low confidence for zero change", () => {
    const check = validateSceneChangeSignal({ changeScore: 0, regionChangeScore: 0 });
    const signal = { changeScore: 0, regionChangeScore: 0 };
    const conf = sceneChangeConfidence(check, signal, 0.8);
    expect(conf).toBeLessThan(0.4);
  });

  it("returns higher confidence for region-focused change", () => {
    const check = validateSceneChangeSignal({ changeScore: 0.3, regionChangeScore: 0.5 });
    const signal = { changeScore: 0.3, regionChangeScore: 0.5 };
    const conf = sceneChangeConfidence(check, signal, 0.8);
    expect(conf).toBeGreaterThan(0.5);
  });
});

/* ── Document / OCR (§44-45) ────────────────────────────────── */

describe("documentSignalPlausible", () => {
  it("rejects negative text length", () => {
    expect(documentSignalPlausible({ textLength: -1, fieldCount: 0 })).toBe(false);
  });

  it("rejects excessively long text", () => {
    expect(documentSignalPlausible({ textLength: 200_000, fieldCount: 0 })).toBe(false);
  });

  it("rejects excessive field count", () => {
    expect(documentSignalPlausible({ textLength: 100, fieldCount: 60 })).toBe(false);
  });

  it("accepts normal values", () => {
    expect(documentSignalPlausible({ textLength: 500, fieldCount: 5 })).toBe(true);
  });
});

describe("documentConfidence", () => {
  it("returns 0 for implausible signal", () => {
    expect(documentConfidence({ textLength: -1, fieldCount: 0 }, 0.8)).toBe(0);
  });

  it("returns low confidence for very short text", () => {
    const conf = documentConfidence({ textLength: 10, fieldCount: 0 }, 0.8);
    expect(conf).toBeLessThan(0.3);
  });

  it("returns high confidence for substantial document", () => {
    const conf = documentConfidence({ textLength: 600, fieldCount: 5 }, 0.9);
    expect(conf).toBeGreaterThan(0.6);
  });
});

/* ── Unified verdict (deriveVisionVerdict) ───────────────────── */

describe("deriveVisionVerdict", () => {
  it("rejects low quality immediately", () => {
    const verdict = deriveVisionVerdict("photo", {
      averageConfidence: 0.8,
      qualityScore: 0.2,
    });
    expect(verdict.supported).toBe(false);
    expect(verdict.reasonCode).toBe("LOW_QUALITY");
  });

  it("supports rep count with high quality", () => {
    const verdict = deriveVisionVerdict("pose", {
      averageConfidence: 0.9,
      qualityScore: 0.8,
      repCount: 10,
    });
    expect(verdict.supported).toBe(true);
    expect(verdict.reasonCode).toBe("REPETITION_VERIFIED");
  });

  it("supports object count matching target", () => {
    const verdict = deriveVisionVerdict("photo", {
      averageConfidence: 0.8,
      qualityScore: 0.8,
      objectCount: 5,
    }, 5);
    expect(verdict.supported).toBe(true);
    expect(verdict.reasonCode).toBe("OBJECT_COUNT_VERIFIED");
  });

  it("reports partial object count as uncertain", () => {
    const verdict = deriveVisionVerdict("photo", {
      averageConfidence: 0.8,
      qualityScore: 0.8,
      objectCount: 3,
    }, 5);
    expect(verdict.supported).toBe(false);
    expect(verdict.uncertain).toBe(true);
    expect(verdict.reasonCode).toBe("OBJECT_COUNT_PARTIAL");
  });

  it("supports scene change", () => {
    const verdict = deriveVisionVerdict("photo", {
      averageConfidence: 0.7,
      qualityScore: 0.7,
      changeScore: 0.25,
      regionChangeScore: 0.4,
    });
    expect(verdict.supported).toBe(true);
    expect(verdict.reasonCode).toBe("SCENE_CHANGE_VERIFIED");
  });

  it("supports document analysis with sufficient text", () => {
    const verdict = deriveVisionVerdict("evidence", {
      averageConfidence: 0.8,
      qualityScore: 0.8,
      textLength: 500,
      fieldCount: 4,
    });
    expect(verdict.supported).toBe(true);
    expect(verdict.reasonCode).toBe("DOCUMENT_ANALYZED");
  });
});
