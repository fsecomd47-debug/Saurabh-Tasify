export type EvidenceKind = "ocr" | "photo" | "pose" | "object" | "scene" | "video" | "document";

export type ProviderDecision = "supported" | "uncertain" | "rejected";

export type EvidenceStatus = "pending" | "quality_gate" | "accepted" | "rejected" | "expired";

export interface EvidenceSession {
  id: string;
  missionId: string;
  userId: string;
  sessionNonce: string;
  startedAt: Date;
  expiresAt: Date;
  proofOfLiveness: string;
  status: EvidenceStatus;
  providerResults: ProviderResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderResult {
  providerId: string;
  kind: EvidenceKind;
  decision: ProviderDecision;
  confidence: number;
  observations: Record<string, unknown>;
  rawSignals?: never;
  processedAt: Date;
  processingMs: number;
}

export interface EvidenceManifest {
  sessionId: string;
  missionId: string;
  userId: string;
  nonce: string;
  livenessToken: string;
  submittedAt: Date;
  evidenceItems: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  providerId: string;
  derivedSignals: Record<string, unknown>;
  clientMetadata: {
    captureMs: number;
    deviceInfo: string;
    qualityHints: QualityHints;
  };
  fingerprint?: string;
}

export interface QualityHints {
  resolution?: { width: number; height: number };
  blurScore?: number;
  lightingScore?: number;
  faceDetected?: boolean;
  faceCount?: number;
  textDetected?: boolean;
  textLength?: number;
  objectCount?: number;
  sceneChanged?: boolean;
}

export interface VerificationPolicy {
  id: string;
  missionType: string;
  requiredProviders: EvidenceKind[];
  optionalProviders: EvidenceKind[];
  minProvidersRequired: number;
  qualityGate: QualityGateConfig;
  confidenceThreshold: number;
  antiCheat: AntiCheatConfig;
  privacy: PrivacyConfig;
  version: string;
}

export interface QualityGateConfig {
  minResolution: { width: number; height: number };
  maxBlurScore: number;
  minLightingScore: number;
  requireFaceDetection: boolean;
  maxFaceCount: number;
  requireTextDetection: boolean;
  minTextLength: number;
}

export interface AntiCheatConfig {
  requireSessionNonce: boolean;
  requireLivenessProof: boolean;
  maxSubmissionAgeMs: number;
  requireFingerprint: boolean;
  replayDetection: boolean;
  temporalContinuity: boolean;
  maxEventsPerSession: number;
}

export interface PrivacyConfig {
  storeRawMedia: boolean;
  rawMediaRetentionMs: number;
  piiFields: string[];
  anonymizeLogs: boolean;
}

export interface MissionVerificationRequest {
  missionId: string;
  userId: string;
  sessionId: string;
  sessionNonce: string;
  evidenceManifest: EvidenceManifest;
  providerSignals: ProviderSignal[];
  clientMetadata: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    deviceInfo: string;
  };
}

export interface ProviderSignal {
  providerId: string;
  kind: EvidenceKind;
  observations: Record<string, unknown>;
  confidence: number;
  processedAt: string;
  processingMs: number;
}

export interface MissionVerificationResponse {
  success: boolean;
  verdict: ProviderDecision;
  confidence: number;
  evidenceSessionId: string;
  providerResults: ProviderResult[];
  rewards?: {
    stAmount: number;
    xpAmount: number;
  };
  feedback?: VerificationFeedback;
  error?: string;
}

export interface VerificationFeedback {
  summary: string;
  providerFeedbacks: ProviderFeedback[];
  suggestions: string[];
  humanReadable: string;
}

export interface ProviderFeedback {
  providerId: string;
  kind: EvidenceKind;
  decision: ProviderDecision;
  confidence: number;
  message: string;
  details: Record<string, unknown>;
}

export interface OCRResult {
  text: string;
  fields: Record<string, string>;
  confidence: number;
  language: string;
  processingMs: number;
}

export interface PhotoResult {
  faceDetected: boolean;
  faceCount: number;
  lightingScore: number;
  blurScore: number;
  resolution: { width: number; height: number };
  dominantColors: string[];
  composition: number;
  confidence: number;
}

export interface PoseResult {
  landmarks: PoseLandmark[];
  formScore: number;
  repCount: number;
  invalidRepCount: number;
  bodyAlignment: number;
  confidence: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface ObjectResult {
  objects: DetectedObject[];
  objectCount: number;
  targetMatch: boolean;
  confidence: number;
}

export interface DetectedObject {
  label: string;
  score: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface SceneResult {
  beforeHash: string;
  afterHash: string;
  changeDetected: boolean;
  changeRegions: { x: number; y: number; width: number; height: number }[];
  changeScore: number;
  confidence: number;
}

export interface VideoResult {
  durationMs: number;
  frameCount: number;
  keyFrames: VideoKeyFrame[];
  motionDetected: boolean;
  audioDetected: boolean;
  confidence: number;
}

export interface VideoKeyFrame {
  timestampMs: number;
  hash: string;
  quality: number;
}

export interface DocumentResult {
  documentType: string;
  textExtracted: string;
  fields: Record<string, string>;
  validity: number;
  confidence: number;
}
