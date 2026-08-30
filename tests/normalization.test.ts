import { describe, it, expect } from "vitest";
import {
  normalizeTask,
  extractRepetitions,
  extractDurationSeconds,
} from "@/server/ai/normalization";

/* ── normalizeTask (§9-10) ──────────────────────────────────── */

describe("normalizeTask", () => {
  it("expands word numbers to digits", () => {
    const result = normalizeTask("do ten pushups");
    expect(result.quantity).not.toBeNull();
    expect(result.quantity!.value).toBe(10);
  });

  it("removes filler words", () => {
    const result = normalizeTask("do 10 pushups");
    expect(result.normalizedTitle).toContain("10");
    // Canonical name may be capitalized
    expect(result.normalizedTitle.toLowerCase()).toContain("pushup");
  });

  it("normalizes hyphens and underscores", () => {
    const result = normalizeTask("10 push-ups");
    expect(result.quantity).not.toBeNull();
    expect(result.quantity!.value).toBe(10);
  });

  it("detects canonical activity", () => {
    const result = normalizeTask("20 pushups");
    expect(result.canonicalActivity).not.toBeNull();
    expect(result.canonicalActivity!.id).toBe("pushup");
  });

  it("detects squat activity", () => {
    const result = normalizeTask("30 squats");
    expect(result.canonicalActivity).not.toBeNull();
    expect(result.canonicalActivity!.id).toBe("squat");
  });

  it("detects lunge activity", () => {
    const result = normalizeTask("15 lunges");
    expect(result.canonicalActivity).not.toBeNull();
    expect(result.canonicalActivity!.id).toBe("lunge");
  });

  it("extracts minute-based quantities", () => {
    const result = normalizeTask("study for 30 minutes");
    expect(result.quantity).not.toBeNull();
    expect(result.quantity!.unit).toBe("minutes");
    expect(result.quantity!.value).toBe(30);
  });

  it("extracts hour-based quantities as total minutes", () => {
    const result = normalizeTask("code for 2 hours");
    expect(result.quantity).not.toBeNull();
    // parseQuantity converts hours to total minutes
    expect(result.quantity!.unit).toBe("minutes");
    expect(result.quantity!.value).toBe(120);
  });
});

/* ── extractRepetitions ─────────────────────────────────────── */

describe("extractRepetitions", () => {
  it("extracts from pushup patterns", () => {
    expect(extractRepetitions("10 pushups")).toBe(10);
    expect(extractRepetitions("do 25 push-ups")).toBe(25);
  });

  it("extracts from squat patterns", () => {
    expect(extractRepetitions("30 squats")).toBe(30);
  });

  it("returns null for non-rep tasks", () => {
    expect(extractRepetitions("study for 1 hour")).toBeNull();
    expect(extractRepetitions("clean my desk")).toBeNull();
  });
});

/* ── extractDurationSeconds ─────────────────────────────────── */

describe("extractDurationSeconds", () => {
  it("extracts minutes", () => {
    expect(extractDurationSeconds("study for 30 minutes")).toBe(1800);
  });

  it("extracts hours", () => {
    expect(extractDurationSeconds("code for 2 hours")).toBe(7200);
  });

  it("extracts from hour abbreviation", () => {
    expect(extractDurationSeconds("focus for 1 hr")).toBe(3600);
  });

  it("returns null for non-duration tasks", () => {
    expect(extractDurationSeconds("do 10 pushups")).toBeNull();
  });
});
