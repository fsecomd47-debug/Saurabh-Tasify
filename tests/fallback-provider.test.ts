import { describe, it, expect } from "vitest";
import { FallbackProvider } from "@/server/ai/fallback-provider";

/* ── FallbackProvider task analysis (§14-15) ─────────────────── */

const provider = new FallbackProvider();

describe("FallbackProvider.analyzeTask", () => {
  it("classifies pushup as fitness/repetition/pose", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-1",
      title: "10 pushups",
    });
    expect(result.activityType).toBe("repetition");
    expect(result.verificationMode).toBe("pose");
    expect(result.category).toBe("fitness");
    expect(result.target?.value).toBe(10);
    expect(result.target?.unit).toBe("repetition");
  });

  it("classifies squat as fitness/repetition/pose", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-2",
      title: "20 squats",
    });
    expect(result.activityType).toBe("repetition");
    expect(result.verificationMode).toBe("pose");
  });

  it("classifies study as focus/focus", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-3",
      title: "Study coding for 1 hour",
    });
    expect(result.activityType).toBe("focus");
    expect(result.verificationMode).toBe("focus");
  });

  it("classifies clean desk as visual_result/photo", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-4",
      title: "Clean my desk",
    });
    expect(result.activityType).toBe("visual_result");
    expect(result.verificationMode).toBe("photo");
  });

  it("classifies financial task as external_result/evidence", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-5",
      title: "Earn $100",
    });
    expect(result.activityType).toBe("external_result");
    expect(result.verificationMode).toBe("activity_signal");
  });

  it("classifies simple task as simple/self_reported", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-6",
      title: "Drink water",
    });
    expect(result.activityType).toBe("simple");
    expect(result.verificationMode).toBe("self_reported");
  });

  it("extracts duration from text", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-7",
      title: "Read for 45 minutes",
    });
    expect(result.activityType).toBe("focus");
    expect(result.estimatedMinutes).toBe(45);
  });

  it("returns non-zero confidence", async () => {
    const result = await provider.analyzeTask({
      taskId: "test-8",
      title: "Do 15 lunges",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
