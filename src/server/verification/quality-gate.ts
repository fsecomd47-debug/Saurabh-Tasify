import type {
  QualityGateConfig,
  QualityHints,
  EvidenceKind,
  EvidenceItem,
} from "../../types/evidence";

export interface QualityGateResult {
  passed: boolean;
  score: number;
  checks: QualityCheck[];
  blockReasons: string[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  expected: unknown;
  actual: unknown;
  message: string;
}

export class QualityGate {
  static evaluate(
    hints: QualityHints,
    config: QualityGateConfig,
    kind: EvidenceKind
  ): QualityGateResult {
    const checks: QualityCheck[] = [];
    const blockReasons: string[] = [];

    if (hints.resolution) {
      const resCheck = this.checkResolution(hints.resolution, config);
      checks.push(resCheck);
      if (!resCheck.passed) blockReasons.push(resCheck.message);
    }

    if (hints.blurScore !== undefined) {
      const blurCheck = this.checkBlur(hints.blurScore, config);
      checks.push(blurCheck);
      if (!blurCheck.passed) blockReasons.push(blurCheck.message);
    }

    if (hints.lightingScore !== undefined) {
      const lightCheck = this.checkLighting(hints.lightingScore, config);
      checks.push(lightCheck);
      if (!lightCheck.passed) blockReasons.push(lightCheck.message);
    }

    if (config.requireFaceDetection && kind === "photo") {
      const faceCheck = this.checkFace(hints, config);
      checks.push(faceCheck);
      if (!faceCheck.passed) blockReasons.push(faceCheck.message);
    }

    if (config.requireTextDetection && kind === "ocr") {
      const textCheck = this.checkText(hints, config);
      checks.push(textCheck);
      if (!textCheck.passed) blockReasons.push(textCheck.message);
    }

    const passed = checks.every((c) => c.passed);
    const score =
      checks.length > 0
        ? checks.reduce((sum, c) => sum + c.score, 0) / checks.length
        : 1;

    return { passed, score, checks, blockReasons };
  }

  private static checkResolution(
    resolution: { width: number; height: number },
    config: QualityGateConfig
  ): QualityCheck {
    const passed =
      resolution.width >= config.minResolution.width &&
      resolution.height >= config.minResolution.height;

    const score = passed
      ? Math.min(
          1,
          (resolution.width * resolution.height) /
            (config.minResolution.width * config.minResolution.height * 2)
        )
      : 0.1;

    return {
      name: "resolution",
      passed,
      score,
      expected: `${config.minResolution.width}x${config.minResolution.height}+`,
      actual: `${resolution.width}x${resolution.height}`,
      message: passed
        ? "Resolution OK"
        : `Resolution too low: ${resolution.width}x${resolution.height} (need ${config.minResolution.width}x${config.minResolution.height})`,
    };
  }

  private static checkBlur(
    blurScore: number,
    config: QualityGateConfig
  ): QualityCheck {
    const passed = blurScore <= config.maxBlurScore;
    const score = passed ? 1 - blurScore / config.maxBlurScore : 0.2;

    return {
      name: "blur",
      passed,
      score,
      expected: `<= ${config.maxBlurScore}`,
      actual: blurScore,
      message: passed
        ? "Image is sharp"
        : `Image too blurry: ${blurScore.toFixed(2)} (max ${config.maxBlurScore})`,
    };
  }

  private static checkLighting(
    lightingScore: number,
    config: QualityGateConfig
  ): QualityCheck {
    const passed = lightingScore >= config.minLightingScore;
    const score = passed
      ? Math.min(1, lightingScore / config.minLightingScore)
      : lightingScore / config.minLightingScore;

    return {
      name: "lighting",
      passed,
      score,
      expected: `>= ${config.minLightingScore}`,
      actual: lightingScore,
      message: passed
        ? "Lighting OK"
        : `Lighting too poor: ${lightingScore.toFixed(2)} (need ${config.minLightingScore})`,
    };
  }

  private static checkFace(
    hints: QualityHints,
    config: QualityGateConfig
  ): QualityCheck {
    const faceDetected = hints.faceDetected ?? false;
    const faceCount = hints.faceCount ?? 0;
    const passed = faceDetected && faceCount <= config.maxFaceCount;
    const score = faceDetected
      ? faceCount <= config.maxFaceCount
        ? 1
        : 0.5
      : 0;

    return {
      name: "face_detection",
      passed,
      score,
      expected: `detected, <= ${config.maxFaceCount} faces`,
      actual: `${faceDetected ? "detected" : "not detected"}, ${faceCount} faces`,
      message: passed
        ? "Face detection OK"
        : !faceDetected
        ? "No face detected in photo"
        : `Too many faces: ${faceCount} (max ${config.maxFaceCount})`,
    };
  }

  private static checkText(
    hints: QualityHints,
    config: QualityGateConfig
  ): QualityCheck {
    const textDetected = hints.textDetected ?? false;
    const textLength = hints.textLength ?? 0;
    const passed = textDetected && textLength >= config.minTextLength;
    const score = textDetected
      ? Math.min(1, textLength / config.minTextLength)
      : 0;

    return {
      name: "text_detection",
      passed,
      score,
      expected: `detected, >= ${config.minTextLength} chars`,
      actual: `${textDetected ? "detected" : "not detected"}, ${textLength} chars`,
      message: passed
        ? "Text detection OK"
        : !textDetected
        ? "No text detected in image"
        : `Text too short: ${textLength} chars (need ${config.minTextLength})`,
    };
  }

  static gate1Client(
    hints: QualityHints,
    kind: EvidenceKind
  ): { passed: boolean; hints: QualityHints } {
    const relaxedConfig: QualityGateConfig = {
      minResolution: { width: 320, height: 240 },
      maxBlurScore: 0.7,
      minLightingScore: 0.2,
      requireFaceDetection: false,
      maxFaceCount: 5,
      requireTextDetection: false,
      minTextLength: 0,
    };

    const result = this.evaluate(hints, relaxedConfig, kind);
    return { passed: result.passed, hints };
  }

  static gate2Server(
    evidenceItem: EvidenceItem,
    config: QualityGateConfig
  ): QualityGateResult {
    const hints: QualityHints = {
      ...evidenceItem.clientMetadata.qualityHints,
    };
    return this.evaluate(hints, config, evidenceItem.kind);
  }
}
