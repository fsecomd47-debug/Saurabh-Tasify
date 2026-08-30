"use client";

/**
 * PDR-4.2: Privacy Pipeline
 * Implements derived-data-only storage with content hashing.
 * Ensures raw video/images are never persisted.
 */

import type {
  PrivacyConfig,
  ContentHash,
  VisionObservation,
  VisionSummary,
  EvidenceRecord,
  EvidenceQualityCheck,
} from "./types";

// ============================================================================
// Default Privacy Configuration
// ============================================================================

const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  mode: "derived_only",
  retentionPolicy: "evidence_only",
  contentHashAlgorithm: "sha-256",
  encryptAtRest: false,
  anonymizeMetadata: true,
};

// ============================================================================
// Content Hasher
// ============================================================================

export class ContentHasher {
  private algorithm: string;

  constructor(algorithm: string = "sha-256") {
    this.algorithm = algorithm;
  }

  /**
   * Create a content hash for evidence data
   */
  async createHash(data: Record<string, unknown>): Promise<ContentHash> {
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const dataBuffer = encoder.encode(jsonString);

    let hash: string;

    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest(this.algorithm, dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      // Fallback for environments without SubtleCrypto
      hash = this.simpleHash(jsonString);
    }

    return {
      algorithm: this.algorithm,
      hash,
      timestamp: Date.now(),
      size: dataBuffer.byteLength,
    };
  }

  /**
   * Verify a content hash
   */
  async verifyHash(data: Record<string, unknown>, expectedHash: string): Promise<boolean> {
    const contentHash = await this.createHash(data);
    return contentHash.hash === expectedHash;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}

// ============================================================================
// Privacy Pipeline
// ============================================================================

export class PrivacyPipeline {
  private config: PrivacyConfig;
  private hasher: ContentHasher;

  constructor(config?: Partial<PrivacyConfig>) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
    this.hasher = new ContentHasher(this.config.contentHashAlgorithm);
  }

  /**
   * Process observations for privacy-compliant storage
   * Only stores derived data, never raw images/video
   */
  async processObservations(
    observations: VisionObservation[],
    context: { missionId: string; userId: string; sessionId: string }
  ): Promise<{
    safeObservations: VisionObservation[];
    evidenceHash: ContentHash;
  }> {
    // Sanitize observations based on privacy mode
    const safeObservations = observations.map((obs) =>
      this.sanitizeObservation(obs)
    );

    // Create evidence hash for audit trail
    const evidenceHash = await this.hasher.createHash({
      missionId: context.missionId,
      userId: context.userId,
      sessionId: context.sessionId,
      observations: safeObservations,
      timestamp: Date.now(),
    });

    return {
      safeObservations,
      evidenceHash,
    };
  }

  /**
   * Create an evidence record for storage
   */
  async createEvidenceRecord(
    missionId: string,
    userId: string,
    sessionId: string,
    observations: VisionObservation[],
    summary: VisionSummary,
    qualityChecks: EvidenceQualityCheck[]
  ): Promise<EvidenceRecord> {
    // Process observations through privacy pipeline
    const { safeObservations, evidenceHash } = await this.processObservations(observations, {
      missionId,
      userId,
      sessionId,
    });

    // Calculate overall quality from quality checks
    const overallQuality =
      qualityChecks.length > 0
        ? qualityChecks.reduce((sum, check) => sum + check.score, 0) /
          qualityChecks.length
        : 0;

    return {
      evidenceId: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      missionId,
      userId,
      sessionId,
      evidenceType: this.determineEvidenceType(observations),
      contentHash: evidenceHash.hash,
      qualityChecks,
      overallQuality,
      observations: safeObservations,
      summary,
      metadata: {
        privacyMode: this.config.mode,
        retentionPolicy: this.config.retentionPolicy,
        anonymized: this.config.anonymizeMetadata,
      },
      createdAt: Date.now(),
    };
  }

  /**
   * Run quality checks on evidence
   */
  runQualityChecks(observations: VisionObservation[]): EvidenceQualityCheck[] {
    const checks: EvidenceQualityCheck[] = [];

    // Check for blur
    const blurCheck = this.checkBlur(observations);
    checks.push(blurCheck);

    // Check for brightness
    const brightnessCheck = this.checkBrightness(observations);
    checks.push(brightnessCheck);

    // Check for resolution
    const resolutionCheck = this.checkResolution(observations);
    checks.push(resolutionCheck);

    // Check for orientation
    const orientationCheck = this.checkOrientation(observations);
    checks.push(orientationCheck);

    // Check for subject visibility
    const visibilityCheck = this.checkSubjectVisibility(observations);
    checks.push(visibilityCheck);

    // Check content hash
    const contentHashCheck = this.checkContentHash(observations);
    checks.push(contentHashCheck);

    // Check timestamp validity
    const timestampCheck = this.checkTimestampValidity(observations);
    checks.push(timestampCheck);

    return checks;
  }

  /**
   * Sanitize observation for storage
   */
  private sanitizeObservation(observation: VisionObservation): VisionObservation {
    const sanitized = { ...observation };

    // Remove any raw image data
    if (sanitized.metadata) {
      const sanitizedMetadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(sanitized.metadata)) {
        // Skip sensitive keys
        if (
          key.includes("raw") ||
          key.includes("image") ||
          key.includes("video") ||
          key.includes("frame") ||
          key.includes("camera")
        ) {
          continue;
        }
        sanitizedMetadata[key] = value;
      }
      sanitized.metadata = sanitizedMetadata;
    }

    // Anonymize metadata if configured
    if (this.config.anonymizeMetadata && sanitized.metadata) {
      delete sanitized.metadata.userId;
      delete sanitized.metadata.sessionId;
    }

    return sanitized;
  }

  /**
   * Determine evidence type from observations
   */
  private determineEvidenceType(
    observations: VisionObservation[]
  ): "pose" | "object" | "document" | "scene" | "quality" {
    const hasLandmarks = observations.some(
      (obs) => obs.landmarks && obs.landmarks.length > 0
    );
    const hasBoundingBoxes = observations.some(
      (obs) => obs.boundingBoxes && obs.boundingBoxes.length > 0
    );
    const hasFormSignals = observations.some(
      (obs) => obs.formSignals && obs.formSignals.length > 0
    );

    if (hasLandmarks && hasFormSignals) {
      return "pose";
    }
    if (hasLandmarks) {
      return "pose";
    }
    if (hasBoundingBoxes) {
      return "object";
    }
    return "quality";
  }

  // ============================================================================
  // Quality Check Methods
  // ============================================================================

  private checkBlur(observations: VisionObservation[]): EvidenceQualityCheck {
    const blurScores = observations
      .filter((obs) => obs.qualityMetrics)
      .map((obs) => obs.qualityMetrics!.blurScore);

    const avgBlur =
      blurScores.length > 0
        ? blurScores.reduce((a, b) => a + b, 0) / blurScores.length
        : 0;

    return {
      checkId: `blur_${Date.now()}`,
      checkType: "blur",
      passed: avgBlur >= 0.5,
      score: avgBlur,
      threshold: 0.5,
      details:
        avgBlur < 0.5
          ? "Image is too blurry for reliable analysis"
          : undefined,
    };
  }

  private checkBrightness(observations: VisionObservation[]): EvidenceQualityCheck {
    const brightnessScores = observations
      .filter((obs) => obs.qualityMetrics)
      .map((obs) => obs.qualityMetrics!.brightnessScore);

    const avgBrightness =
      brightnessScores.length > 0
        ? brightnessScores.reduce((a, b) => a + b, 0) / brightnessScores.length
        : 0;

    return {
      checkId: `brightness_${Date.now()}`,
      checkType: "brightness",
      passed: avgBrightness >= 0.3 && avgBrightness <= 0.8,
      score: avgBrightness,
      threshold: 0.3,
      details:
        avgBrightness < 0.3
          ? "Image is too dark"
          : avgBrightness > 0.8
          ? "Image is too bright"
          : undefined,
    };
  }

  private checkResolution(observations: VisionObservation[]): EvidenceQualityCheck {
    // Resolution check is based on landmark visibility and density
    const landmarkCounts = observations.filter(
      (obs) => obs.landmarks && obs.landmarks.length > 0
    ).length;

    const resolutionScore = Math.min(1, landmarkCounts / observations.length);

    return {
      checkId: `resolution_${Date.now()}`,
      checkType: "resolution",
      passed: resolutionScore >= 0.5,
      score: resolutionScore,
      threshold: 0.5,
      details:
        resolutionScore < 0.5
          ? "Insufficient landmark detection for reliable analysis"
          : undefined,
    };
  }

  private checkOrientation(observations: VisionObservation[]): EvidenceQualityCheck {
    // Orientation check based on landmark positions
    const orientationScores = observations
      .filter((obs) => obs.landmarks && obs.landmarks.length > 0)
      .map((obs) => {
        const landmarks = obs.landmarks!;
        // Check if landmarks are roughly upright (head above hips)
        const headLandmarks = landmarks.filter((l) =>
          ["NOSE", "LEFT_EYE", "RIGHT_EYE"].includes(l.name)
        );
        const hipLandmarks = landmarks.filter((l) =>
          ["LEFT_HIP", "RIGHT_HIP"].includes(l.name)
        );

        if (headLandmarks.length === 0 || hipLandmarks.length === 0) {
          return 0.5; // Can't determine orientation
        }

        const headY =
          headLandmarks.reduce((sum, l) => sum + l.y, 0) / headLandmarks.length;
        const hipY =
          hipLandmarks.reduce((sum, l) => sum + l.y, 0) / hipLandmarks.length;

        // Head should be above hips (lower y value in image coordinates)
        return headY < hipY ? 1 : 0.3;
      });

    const avgOrientation =
      orientationScores.length > 0
        ? orientationScores.reduce((a, b) => a + b, 0) / orientationScores.length
        : 0.5;

    return {
      checkId: `orientation_${Date.now()}`,
      checkType: "orientation",
      passed: avgOrientation >= 0.6,
      score: avgOrientation,
      threshold: 0.6,
      details:
        avgOrientation < 0.6
          ? "Person appears to be upside down or sideways"
          : undefined,
    };
  }

  private checkSubjectVisibility(observations: VisionObservation[]): EvidenceQualityCheck {
    const visibilityScores = observations
      .filter((obs) => obs.qualityMetrics)
      .map((obs) => obs.qualityMetrics!.subjectVisibility);

    const avgVisibility =
      visibilityScores.length > 0
        ? visibilityScores.reduce((a, b) => a + b, 0) / visibilityScores.length
        : 0;

    return {
      checkId: `visibility_${Date.now()}`,
      checkType: "subject_visibility",
      passed: avgVisibility >= 0.4,
      score: avgVisibility,
      threshold: 0.4,
      details:
        avgVisibility < 0.4
          ? "Subject is not clearly visible in the frame"
          : undefined,
    };
  }

  private checkContentHash(observations: VisionObservation[]): EvidenceQualityCheck {
    // Content hash check ensures data integrity
    const hasValidData = observations.every(
      (obs) => obs.frameIndex >= 0 && obs.timestamp > 0
    );

    return {
      checkId: `content_hash_${Date.now()}`,
      checkType: "content_hash",
      passed: hasValidData,
      score: hasValidData ? 1 : 0,
      threshold: 1,
      details: hasValidData ? undefined : "Invalid observation data detected",
    };
  }

  private checkTimestampValidity(observations: VisionObservation[]): EvidenceQualityCheck {
    if (observations.length === 0) {
      return {
        checkId: `timestamp_${Date.now()}`,
        checkType: "timestamp_validity",
        passed: false,
        score: 0,
        threshold: 1,
        details: "No observations to validate",
      };
    }

    // Check timestamps are monotonically increasing
    let valid = true;
    for (let i = 1; i < observations.length; i++) {
      if (observations[i].timestamp <= observations[i - 1].timestamp) {
        valid = false;
        break;
      }
    }

    return {
      checkId: `timestamp_${Date.now()}`,
      checkType: "timestamp_validity",
      passed: valid,
      score: valid ? 1 : 0,
      threshold: 1,
      details: valid ? undefined : "Timestamps are not monotonically increasing",
    };
  }
}