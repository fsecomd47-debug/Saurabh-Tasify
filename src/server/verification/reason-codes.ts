/**
 * PDR-4.3 §185: Reason Code Registry
 * All verification reason codes with human-readable messages.
 * Used for internal debugging and user-facing feedback.
 */

export type ReasonCode =
  // Photo quality
  | "BLUR_TOO_HIGH"
  | "SUBJECT_NOT_VISIBLE"
  | "MULTIPLE_SUBJECTS"
  | "LOW_RESOLUTION"
  | "MOTION_BLUR"
  | "EXPOSURE_TOO_DARK"
  | "EXPOSURE_TOO_BRIGHT"
  | "WRONG_ORIENTATION"

  // OCR
  | "OCR_UNREADABLE"
  | "OCR_TEXT_TOO_SHORT"
  | "OCR_AMBIGUOUS"
  | "DOCUMENT_CROPPED"
  | "DOCUMENT_SKEWED"
  | "CURRENCY_MISMATCH"
  | "AMOUNT_MISMATCH"

  // Object
  | "OBJECT_COUNT_LOW"
  | "OBJECT_COUNT_HIGH"
  | "OBJECT_NOT_DETECTED"
  | "OBJECT_WRONG_TYPE"

  // Scene
  | "SCENE_UNCHANGED"
  | "SCENE_SIGNAL_IMPLAUSIBLE"
  | "BEFORE_MISSING"
  | "AFTER_MISSING"

  // Pose
  | "POSE_DEPTH_LOW"
  | "POSE_ALIGNMENT_POOR"
  | "POSE_CONTINUITY_BROKEN"
  | "POSE_SUBJECT_MISSING"
  | "POSE_MULTIPLE_SUBJECTS"
  | "POSE_VELOCITY_INVALID"
  | "POSE_JITTER_DETECTED"

  // Rep counting
  | "REP_TARGET_NOT_REACHED"
  | "REP_NEAR_TARGET"
  | "REP_INSUFFICIENT_REPS"
  | "REP_INVALID_FORM"

  // Video
  | "VIDEO_INTERRUPTED"
  | "VIDEO_DURATION_SHORT"
  | "VIDEO_BLACK_FRAME"
  | "VIDEO_FROZEN"

  // Anti-cheat
  | "EVIDENCE_REPLAY"
  | "EVIDENCE_DUPLICATE"
  | "SESSION_EXPIRED"
  | "SESSION_NONCE_MISMATCH"
  | "USER_MISMATCH"
  | "MISSION_MISMATCH"
  | "TIMESTAMP_REGRESSION"
  | "FRAME_INDEX_REGRESSION"
  | "RATE_LIMIT_EXCEEDED"
  | "ANTI_CHEAT_FAILED"

  // Anomaly
  | "ANOMALY_SUSPICIOUS"
  | "ANOMALY_REVIEW"
  | "ANOMALY_RESTRICTED"

  // General
  | "QUALITY_PASSED"
  | "PHOTO_EVIDENCE_SUBMITTED"
  | "PHOTO_QUALITY_INSUFFICIENT"
  | "NO_PHOTO_SUBMITTED"
  | "PUSHUP_TARGET_REACHED"
  | "PUSHUP_NEAR_TARGET"
  | "PUSHUP_INSUFFICIENT_REPS"
  | "SQUAT_TARGET_REACHED"
  | "SQUAT_NEAR_TARGET"
  | "SQUAT_INSUFFICIENT_REPS"
  | "VISION_VERIFIED"
  | "REPETITION_VERIFIED"
  | "OBJECT_COUNT_VERIFIED"
  | "OBJECT_COUNT_PARTIAL"
  | "SCENE_CHANGE_VERIFIED"
  | "DOCUMENT_ANALYZED"
  | "LOW_QUALITY"
  | "UNKNOWN";

type ReasonCodeEntry = {
  code: ReasonCode;
  userMessage: string;
  internalMessage: string;
  severity: "info" | "warning" | "error" | "critical";
  category: string;
  retryable: boolean;
};

const REASON_CODES: Record<ReasonCode, ReasonCodeEntry> = {
  // Photo quality
  BLUR_TOO_HIGH: {
    code: "BLUR_TOO_HIGH",
    userMessage: "The image is blurry. Hold the camera steady and try again.",
    internalMessage: "Image blur score exceeds threshold",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  SUBJECT_NOT_VISIBLE: {
    code: "SUBJECT_NOT_VISIBLE",
    userMessage: "Keep your full body inside the frame.",
    internalMessage: "No subject detected in frame",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  MULTIPLE_SUBJECTS: {
    code: "MULTIPLE_SUBJECTS",
    userMessage: "Only one person should be in frame.",
    internalMessage: "Multiple subjects detected",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  LOW_RESOLUTION: {
    code: "LOW_RESOLUTION",
    userMessage: "Image quality is too low. Try again.",
    internalMessage: "Resolution below minimum threshold",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  MOTION_BLUR: {
    code: "MOTION_BLUR",
    userMessage: "The image is blurry from movement. Hold steady.",
    internalMessage: "Motion blur detected",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  EXPOSURE_TOO_DARK: {
    code: "EXPOSURE_TOO_DARK",
    userMessage: "The scene is too dark. Add more light.",
    internalMessage: "Image brightness below threshold",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  EXPOSURE_TOO_BRIGHT: {
    code: "EXPOSURE_TOO_BRIGHT",
    userMessage: "The image is too bright. Reduce direct light.",
    internalMessage: "Image brightness above threshold",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  WRONG_ORIENTATION: {
    code: "WRONG_ORIENTATION",
    userMessage: "Rotate your device to the correct orientation.",
    internalMessage: "Wrong device orientation",
    severity: "info",
    category: "photo",
    retryable: true,
  },

  // OCR
  OCR_UNREADABLE: {
    code: "OCR_UNREADABLE",
    userMessage: "We couldn't read the text clearly. Hold steady and try again.",
    internalMessage: "OCR confidence below threshold",
    severity: "warning",
    category: "ocr",
    retryable: true,
  },
  OCR_TEXT_TOO_SHORT: {
    code: "OCR_TEXT_TOO_SHORT",
    userMessage: "Not enough text was detected. Make sure all text is visible.",
    internalMessage: "Extracted text length below minimum",
    severity: "warning",
    category: "ocr",
    retryable: true,
  },
  OCR_AMBIGUOUS: {
    code: "OCR_AMBIGUOUS",
    userMessage: "The text was unclear. Please retake with better focus.",
    internalMessage: "OCR output is ambiguous",
    severity: "warning",
    category: "ocr",
    retryable: true,
  },
  DOCUMENT_CROPPED: {
    code: "DOCUMENT_CROPPED",
    userMessage: "Show all four corners of the document.",
    internalMessage: "Document boundaries not fully visible",
    severity: "warning",
    category: "ocr",
    retryable: true,
  },
  DOCUMENT_SKEWED: {
    code: "DOCUMENT_SKEWED",
    userMessage: "Hold the document flat and straight.",
    internalMessage: "Document perspective is skewed",
    severity: "info",
    category: "ocr",
    retryable: true,
  },
  CURRENCY_MISMATCH: {
    code: "CURRENCY_MISMATCH",
    userMessage: "The currency doesn't match the requirement.",
    internalMessage: "Extracted currency doesn't match mission policy",
    severity: "error",
    category: "ocr",
    retryable: false,
  },
  AMOUNT_MISMATCH: {
    code: "AMOUNT_MISMATCH",
    userMessage: "The amount doesn't match the requirement.",
    internalMessage: "Extracted amount doesn't match mission policy",
    severity: "error",
    category: "ocr",
    retryable: false,
  },

  // Object
  OBJECT_COUNT_LOW: {
    code: "OBJECT_COUNT_LOW",
    userMessage: "We can see fewer items than required. Make sure all items are visible.",
    internalMessage: "Detected object count below target",
    severity: "warning",
    category: "object",
    retryable: true,
  },
  OBJECT_COUNT_HIGH: {
    code: "OBJECT_COUNT_HIGH",
    userMessage: "Too many items detected. Focus on the required items.",
    internalMessage: "Detected object count above reasonable threshold",
    severity: "warning",
    category: "object",
    retryable: true,
  },
  OBJECT_NOT_DETECTED: {
    code: "OBJECT_NOT_DETECTED",
    userMessage: "We couldn't detect the required items. Make sure they're clearly visible.",
    internalMessage: "Target object not detected",
    severity: "warning",
    category: "object",
    retryable: true,
  },
  OBJECT_WRONG_TYPE: {
    code: "OBJECT_WRONG_TYPE",
    userMessage: "The detected items don't match the requirement.",
    internalMessage: "Detected object type doesn't match target",
    severity: "error",
    category: "object",
    retryable: false,
  },

  // Scene
  SCENE_UNCHANGED: {
    code: "SCENE_UNCHANGED",
    userMessage: "We couldn't detect a meaningful change. Make sure the scene is different.",
    internalMessage: "Scene change score below threshold",
    severity: "warning",
    category: "scene",
    retryable: true,
  },
  SCENE_SIGNAL_IMPLAUSIBLE: {
    code: "SCENE_SIGNAL_IMPLAUSIBLE",
    userMessage: "The scene comparison seems unusual. Please retake both photos.",
    internalMessage: "Scene change signal is physically implausible",
    severity: "error",
    category: "scene",
    retryable: true,
  },
  BEFORE_MISSING: {
    code: "BEFORE_MISSING",
    userMessage: "Please take a 'before' photo first.",
    internalMessage: "Before photo not provided",
    severity: "error",
    category: "scene",
    retryable: true,
  },
  AFTER_MISSING: {
    code: "AFTER_MISSING",
    userMessage: "Please take an 'after' photo.",
    internalMessage: "After photo not provided",
    severity: "error",
    category: "scene",
    retryable: true,
  },

  // Pose
  POSE_DEPTH_LOW: {
    code: "POSE_DEPTH_LOW",
    userMessage: "Go a little lower.",
    internalMessage: "Pose depth below threshold",
    severity: "info",
    category: "pose",
    retryable: true,
  },
  POSE_ALIGNMENT_POOR: {
    code: "POSE_ALIGNMENT_POOR",
    userMessage: "Keep your body aligned.",
    internalMessage: "Body alignment score below threshold",
    severity: "info",
    category: "pose",
    retryable: true,
  },
  POSE_CONTINUITY_BROKEN: {
    code: "POSE_CONTINUITY_BROKEN",
    userMessage: "Your verification was interrupted. Please try again.",
    internalMessage: "Pose continuity broken",
    severity: "warning",
    category: "pose",
    retryable: true,
  },
  POSE_SUBJECT_MISSING: {
    code: "POSE_SUBJECT_MISSING",
    userMessage: "Move back so your full body is visible.",
    internalMessage: "Subject not detected in pose frame",
    severity: "warning",
    category: "pose",
    retryable: true,
  },
  POSE_MULTIPLE_SUBJECTS: {
    code: "POSE_MULTIPLE_SUBJECTS",
    userMessage: "Only one person should be in frame.",
    internalMessage: "Multiple subjects detected in pose frame",
    severity: "warning",
    category: "pose",
    retryable: true,
  },
  POSE_VELOCITY_INVALID: {
    code: "POSE_VELOCITY_INVALID",
    userMessage: "Move at a natural pace.",
    internalMessage: "Movement velocity outside valid range",
    severity: "info",
    category: "pose",
    retryable: true,
  },
  POSE_JITTER_DETECTED: {
    code: "POSE_JITTER_DETECTED",
    userMessage: "Hold steady between reps.",
    internalMessage: "Excessive jitter detected at threshold",
    severity: "info",
    category: "pose",
    retryable: true,
  },

  // Rep counting
  REP_TARGET_NOT_REACHED: {
    code: "REP_TARGET_NOT_REACHED",
    userMessage: "Keep going! You're not done yet.",
    internalMessage: "Repetition target not reached",
    severity: "warning",
    category: "rep",
    retryable: true,
  },
  REP_NEAR_TARGET: {
    code: "REP_NEAR_TARGET",
    userMessage: "Almost there! A few more reps.",
    internalMessage: "Repetition count near target (80%+)",
    severity: "info",
    category: "rep",
    retryable: true,
  },
  REP_INSUFFICIENT_REPS: {
    code: "REP_INSUFFICIENT_REPS",
    userMessage: "Not enough valid reps counted. Keep going!",
    internalMessage: "Insufficient valid repetitions",
    severity: "warning",
    category: "rep",
    retryable: true,
  },
  REP_INVALID_FORM: {
    code: "REP_INVALID_FORM",
    userMessage: "Some reps had form issues. Focus on quality.",
    internalMessage: "Invalid form detected during repetitions",
    severity: "info",
    category: "rep",
    retryable: true,
  },

  // Video
  VIDEO_INTERRUPTED: {
    code: "VIDEO_INTERRUPTED",
    userMessage: "Your verification was interrupted.",
    internalMessage: "Video session interrupted",
    severity: "warning",
    category: "video",
    retryable: true,
  },
  VIDEO_DURATION_SHORT: {
    code: "VIDEO_DURATION_SHORT",
    userMessage: "The video is too short. Keep recording.",
    internalMessage: "Video duration below minimum",
    severity: "warning",
    category: "video",
    retryable: true,
  },
  VIDEO_BLACK_FRAME: {
    code: "VIDEO_BLACK_FRAME",
    userMessage: "The camera feed is black. Check your camera.",
    internalMessage: "Black frame detected in video",
    severity: "error",
    category: "video",
    retryable: true,
  },
  VIDEO_FROZEN: {
    code: "VIDEO_FROZEN",
    userMessage: "The camera feed froze. Try switching cameras.",
    internalMessage: "Video feed appears frozen",
    severity: "error",
    category: "video",
    retryable: true,
  },

  // Anti-cheat
  EVIDENCE_REPLAY: {
    code: "EVIDENCE_REPLAY",
    userMessage: "This evidence was used before. Please provide fresh evidence.",
    internalMessage: "Evidence fingerprint matches previous submission",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },
  EVIDENCE_DUPLICATE: {
    code: "EVIDENCE_DUPLICATE",
    userMessage: "Duplicate evidence detected. Please provide new evidence.",
    internalMessage: "Duplicate evidence submission",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },
  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    userMessage: "Your verification session expired. Please restart.",
    internalMessage: "Evidence session has expired",
    severity: "error",
    category: "anti-cheat",
    retryable: true,
  },
  SESSION_NONCE_MISMATCH: {
    code: "SESSION_NONCE_MISMATCH",
    userMessage: "Session verification failed. Please restart.",
    internalMessage: "Session nonce mismatch",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },
  USER_MISMATCH: {
    code: "USER_MISMATCH",
    userMessage: "User verification failed.",
    internalMessage: "User ID doesn't match session",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },
  MISSION_MISMATCH: {
    code: "MISSION_MISMATCH",
    userMessage: "Mission verification failed.",
    internalMessage: "Mission ID doesn't match session",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },
  TIMESTAMP_REGRESSION: {
    code: "TIMESTAMP_REGRESSION",
    userMessage: "Evidence timing seems off. Please try again.",
    internalMessage: "Timestamp regression detected",
    severity: "error",
    category: "anti-cheat",
    retryable: true,
  },
  FRAME_INDEX_REGRESSION: {
    code: "FRAME_INDEX_REGRESSION",
    userMessage: "Frame sequence seems off. Please try again.",
    internalMessage: "Frame index regression detected",
    severity: "error",
    category: "anti-cheat",
    retryable: true,
  },
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    userMessage: "Too many attempts. Please wait a moment.",
    internalMessage: "Rate limit exceeded",
    severity: "warning",
    category: "anti-cheat",
    retryable: true,
  },
  ANTI_CHEAT_FAILED: {
    code: "ANTI_CHEAT_FAILED",
    userMessage: "Verification failed security checks.",
    internalMessage: "Anti-cheat check failed",
    severity: "critical",
    category: "anti-cheat",
    retryable: false,
  },

  // Anomaly
  ANOMALY_SUSPICIOUS: {
    code: "ANOMALY_SUSPICIOUS",
    userMessage: "Some unusual patterns were detected. Please try again.",
    internalMessage: "Suspicious activity pattern detected",
    severity: "error",
    category: "anomaly",
    retryable: true,
  },
  ANOMALY_REVIEW: {
    code: "ANOMALY_REVIEW",
    userMessage: "Your submission is being reviewed.",
    internalMessage: "Anomaly requires human review",
    severity: "error",
    category: "anomaly",
    retryable: false,
  },
  ANOMALY_RESTRICTED: {
    code: "ANOMALY_RESTRICTED",
    userMessage: "Verification restricted due to unusual activity.",
    internalMessage: "Anomaly level restricted",
    severity: "critical",
    category: "anomaly",
    retryable: false,
  },

  // General
  QUALITY_PASSED: {
    code: "QUALITY_PASSED",
    userMessage: "Image quality OK.",
    internalMessage: "Quality gate passed",
    severity: "info",
    category: "quality",
    retryable: false,
  },
  PHOTO_EVIDENCE_SUBMITTED: {
    code: "PHOTO_EVIDENCE_SUBMITTED",
    userMessage: "Photo evidence captured successfully.",
    internalMessage: "Photo evidence accepted",
    severity: "info",
    category: "photo",
    retryable: false,
  },
  PHOTO_QUALITY_INSUFFICIENT: {
    code: "PHOTO_QUALITY_INSUFFICIENT",
    userMessage: "Photo quality was insufficient. Please retake.",
    internalMessage: "Photo quality below threshold",
    severity: "warning",
    category: "photo",
    retryable: true,
  },
  NO_PHOTO_SUBMITTED: {
    code: "NO_PHOTO_SUBMITTED",
    userMessage: "No photo was submitted.",
    internalMessage: "No photo evidence provided",
    severity: "error",
    category: "photo",
    retryable: true,
  },
  PUSHUP_TARGET_REACHED: {
    code: "PUSHUP_TARGET_REACHED",
    userMessage: "Great job! All pushups completed.",
    internalMessage: "Pushup target reached with valid form",
    severity: "info",
    category: "pose",
    retryable: false,
  },
  PUSHUP_NEAR_TARGET: {
    code: "PUSHUP_NEAR_TARGET",
    userMessage: "Almost there! A few more pushups.",
    internalMessage: "Pushup count near target",
    severity: "info",
    category: "pose",
    retryable: true,
  },
  PUSHUP_INSUFFICIENT_REPS: {
    code: "PUSHUP_INSUFFICIENT_REPS",
    userMessage: "Not enough valid pushups. Keep going!",
    internalMessage: "Insufficient valid pushup repetitions",
    severity: "warning",
    category: "pose",
    retryable: true,
  },
  SQUAT_TARGET_REACHED: {
    code: "SQUAT_TARGET_REACHED",
    userMessage: "Great job! All squats completed.",
    internalMessage: "Squat target reached with valid form",
    severity: "info",
    category: "pose",
    retryable: false,
  },
  SQUAT_NEAR_TARGET: {
    code: "SQUAT_NEAR_TARGET",
    userMessage: "Almost there! A few more squats.",
    internalMessage: "Squat count near target",
    severity: "info",
    category: "pose",
    retryable: true,
  },
  SQUAT_INSUFFICIENT_REPS: {
    code: "SQUAT_INSUFFICIENT_REPS",
    userMessage: "Not enough valid squats. Keep going!",
    internalMessage: "Insufficient valid squat repetitions",
    severity: "warning",
    category: "pose",
    retryable: true,
  },
  VISION_VERIFIED: {
    code: "VISION_VERIFIED",
    userMessage: "Vision verification passed.",
    internalMessage: "Vision verification succeeded",
    severity: "info",
    category: "vision",
    retryable: false,
  },
  REPETITION_VERIFIED: {
    code: "REPETITION_VERIFIED",
    userMessage: "Repetitions verified successfully.",
    internalMessage: "Repetition verification succeeded",
    severity: "info",
    category: "pose",
    retryable: false,
  },
  OBJECT_COUNT_VERIFIED: {
    code: "OBJECT_COUNT_VERIFIED",
    userMessage: "Object count verified.",
    internalMessage: "Object count matches target",
    severity: "info",
    category: "object",
    retryable: false,
  },
  OBJECT_COUNT_PARTIAL: {
    code: "OBJECT_COUNT_PARTIAL",
    userMessage: "Some objects detected but not all.",
    internalMessage: "Partial object count",
    severity: "info",
    category: "object",
    retryable: true,
  },
  SCENE_CHANGE_VERIFIED: {
    code: "SCENE_CHANGE_VERIFIED",
    userMessage: "Scene change verified.",
    internalMessage: "Meaningful scene change detected",
    severity: "info",
    category: "scene",
    retryable: false,
  },
  DOCUMENT_ANALYZED: {
    code: "DOCUMENT_ANALYZED",
    userMessage: "Document analyzed successfully.",
    internalMessage: "Document OCR completed",
    severity: "info",
    category: "ocr",
    retryable: false,
  },
  LOW_QUALITY: {
    code: "LOW_QUALITY",
    userMessage: "Image quality is too low. Please try again.",
    internalMessage: "Quality score below minimum",
    severity: "warning",
    category: "quality",
    retryable: true,
  },
  UNKNOWN: {
    code: "UNKNOWN",
    userMessage: "Something went wrong. Please try again.",
    internalMessage: "Unknown verification outcome",
    severity: "error",
    category: "general",
    retryable: true,
  },
};

export function getReasonCode(code: ReasonCode): ReasonCodeEntry {
  return REASON_CODES[code] || REASON_CODES.UNKNOWN;
}

export function getUserMessage(code: ReasonCode): string {
  return getReasonCode(code).userMessage;
}

export function getInternalMessage(code: ReasonCode): string {
  return getReasonCode(code).internalMessage;
}

export function isRetryable(code: ReasonCode): boolean {
  return getReasonCode(code).retryable;
}

export function getSeverity(code: ReasonCode): string {
  return getReasonCode(code).severity;
}

export function getCategory(code: ReasonCode): string {
  return getReasonCode(code).category;
}
