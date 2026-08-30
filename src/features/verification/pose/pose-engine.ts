/**
 * Pose detection engine for exercise verification.
 *
 * This is a skeleton implementation. The full implementation will use
 * MediaPipe's web vision tooling for on-device pose detection (PDR-3 §24).
 *
 * Architecture (PDR-3 §65):
 * Camera → Vision Worker → Landmarks → Feature Extraction → Rep State → UI
 */

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrame = {
  landmarks: PoseLandmark[];
  timestamp: number;
};

export type ElbowAngle = {
  left: number;
  right: number;
  average: number;
};

/**
 * Calculate the angle between three landmarks (in degrees).
 * Used for elbow angle calculation during pushups, etc.
 */
export function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * Extract elbow angles from pose landmarks.
 * Shoulder (0/11), Elbow (1/12), Wrist (2/13) for right/left.
 */
export function extractElbowAngle(landmarks: PoseLandmark[]): ElbowAngle | null {
  if (landmarks.length < 14) return null;

  // MediaPipe pose landmarks
  // Right: shoulder=11, elbow=12, wrist=13
  // Left: shoulder=1, elbow=2, wrist=3
  const rightAngle = calculateAngle(landmarks[11], landmarks[12], landmarks[13]);
  const leftAngle = calculateAngle(landmarks[1], landmarks[2], landmarks[3]);

  return {
    left: leftAngle,
    right: rightAngle,
    average: (leftAngle + rightAngle) / 2,
  };
}

/**
 * Check if a person is visible in the frame.
 * Based on landmark visibility scores.
 */
export function isPersonVisible(landmarks: PoseLandmark[], threshold = 0.5): boolean {
  if (landmarks.length === 0) return false;
  const visibleCount = landmarks.filter((l) => l.visibility > threshold).length;
  return visibleCount >= landmarks.length * 0.6;
}

/**
 * Stub for future MediaPipe integration.
 * The real implementation will:
 * 1. Initialize MediaPipe Pose
 * 2. Process video frames
 * 3. Extract landmarks
 * 4. Feed to RepCounter
 */
export async function initializePoseDetection(): Promise<{
  processFrame: (video: HTMLVideoElement) => Promise<PoseFrame | null>;
  cleanup: () => void;
}> {
  // TODO: Initialize MediaPipe Pose when ready (Phase 4 full implementation)
  return {
    processFrame: async (_video: HTMLVideoElement) => null,
    cleanup: () => {},
  };
}
