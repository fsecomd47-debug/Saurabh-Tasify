/**
 * PDR-4.3 §85-§98, §159-§163, §192-§196: Mission-Specific Guidance
 * Dynamic coaching based on mission type and failure reason.
 * Never shame users. Always actionable, encouraging feedback.
 */

export type MissionGuidance = {
  beforeStart: string[];
  duringCapture: string[];
  onFailure: Record<string, string>;
  onRetry: string[];
  completionMessage: string;
};

const PUSHUP_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Place your phone where your full body is visible.",
    "Use enough distance to show from head to toes.",
    "Make sure there's enough light.",
  ],
  duringCapture: [
    "Keep your full body in frame.",
    "Move at a natural pace.",
  ],
  onFailure: {
    POSE_DEPTH_LOW: "Go a little lower on each rep.",
    POSE_ALIGNMENT_POOR: "Keep your body in a straight line.",
    POSE_VELOCITY_INVALID: "Slow down and controlled movement.",
    POSE_JITTER_DETECTED: "Hold steady at the top and bottom.",
    POSE_SUBJECT_MISSING: "Move back so your full body is visible.",
    POSE_MULTIPLE_SUBJECTS: "Only one person should be in frame.",
    REP_TARGET_NOT_REACHED: "Keep going! A few more reps.",
    REP_INSUFFICIENT_REPS: "Some reps weren't counted. Focus on full range of motion.",
    REP_INVALID_FORM: "Focus on quality over speed.",
    VIDEO_INTERRUPTED: "Your session was interrupted. Please try again.",
    VIDEO_BLACK_FRAME: "The camera feed is black. Check your camera.",
    VIDEO_FROZEN: "The camera feed froze. Try switching cameras.",
  },
  onRetry: [
    "Get into the starting position.",
    "Make sure your arms are fully extended.",
    "Lower yourself until your elbows are at 90 degrees.",
    "Push back up to full extension.",
  ],
  completionMessage: "Great workout! All pushups completed with good form.",
};

const SQUAT_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Stand facing the camera with enough space.",
    "Your full body should be visible from head to toe.",
    "Make sure there's enough light.",
  ],
  duringCapture: [
    "Keep your chest up.",
    "Go to parallel or below.",
  ],
  onFailure: {
    POSE_DEPTH_LOW: "Go a little deeper — aim for parallel.",
    POSE_ALIGNMENT_POOR: "Keep your back straight and chest up.",
    POSE_VELOCITY_INVALID: "Control the movement — don't rush.",
    POSE_SUBJECT_MISSING: "Move back so your full body is visible.",
    POSE_MULTIPLE_SUBJECTS: "Only one person should be in frame.",
    REP_TARGET_NOT_REACHED: "Keep going! A few more squats.",
    REP_INSUFFICIENT_REPS: "Some squats weren't counted. Try deeper range.",
    REP_INVALID_FORM: "Focus on depth and form.",
    VIDEO_INTERRUPTED: "Your session was interrupted. Please try again.",
  },
  onRetry: [
    "Stand with feet shoulder-width apart.",
    "Lower yourself as if sitting in a chair.",
    "Keep your knees over your toes.",
    "Push back up to standing.",
  ],
  completionMessage: "Excellent work! All squats completed with good form.",
};

const LUNGE_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Stand facing the camera with enough space to step forward.",
    "Your full body should be visible.",
  ],
  duringCapture: [
    "Keep your front knee over your ankle.",
    "Lower your back knee toward the ground.",
  ],
  onFailure: {
    POSE_DEPTH_LOW: "Lower your back knee closer to the ground.",
    POSE_ALIGNMENT_POOR: "Keep your torso upright.",
    POSE_SUBJECT_MISSING: "Move back so your full body is visible.",
    REP_TARGET_NOT_REACHED: "Keep going! A few more lunges.",
    REP_INSUFFICIENT_REPS: "Some lunges weren't counted. Try deeper range.",
  },
  onRetry: [
    "Step forward with one leg.",
    "Lower until both knees are at 90 degrees.",
    "Push back to starting position.",
    "Alternate legs.",
  ],
  completionMessage: "Great work! All lunges completed.",
};

const PHOTO_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Make sure the subject is clearly visible.",
    "Good lighting helps us verify your evidence.",
  ],
  duringCapture: [
    "Hold the camera steady.",
    "Make sure everything is in frame.",
  ],
  onFailure: {
    BLUR_TOO_HIGH: "Hold still and retake the photo.",
    SUBJECT_NOT_VISIBLE: "Make sure the subject is clearly in frame.",
    LOW_RESOLUTION: "Try moving a little closer.",
    EXPOSURE_TOO_DARK: "Add more light to the scene.",
    EXPOSURE_TOO_BRIGHT: "Reduce direct light on the subject.",
    MOTION_BLUR: "Hold the camera steady when capturing.",
    DOCUMENT_CROPPED: "Show all four corners of the document.",
    DOCUMENT_SKEWED: "Hold the document flat and straight.",
    OCR_UNREADABLE: "Make sure the text is clearly visible and well-lit.",
    OBJECT_COUNT_LOW: "Make sure all required items are visible.",
    OBJECT_NOT_DETECTED: "Position the items so they're clearly visible.",
  },
  onRetry: [
    "Check the lighting and focus.",
    "Make sure the subject fills the frame.",
  ],
  completionMessage: "Evidence captured successfully!",
};

const SCENE_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Take a photo of the scene before you start.",
    "Make note of the angle and position.",
  ],
  duringCapture: [
    "After cleaning, take another photo from the same angle.",
  ],
  onFailure: {
    SCENE_UNCHANGED: "The scene doesn't look different. Make sure you've made changes.",
    BEFORE_MISSING: "Please take a 'before' photo first.",
    AFTER_MISSING: "Please take an 'after' photo.",
    SCENE_SIGNAL_IMPLAUSIBLE: "Please retake both photos from the same position.",
  },
  onRetry: [
    "Take the 'before' photo from your chosen angle.",
    "After completing the task, take the 'after' photo from the same angle.",
  ],
  completionMessage: "Scene change verified! Great work.",
};

const STUDY_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Set up your workspace with good lighting.",
    "Make sure your camera can see you.",
    "Close distracting apps and tabs.",
  ],
  duringCapture: [
    "Stay visible to the camera.",
    "Focus on your work.",
  ],
  onFailure: {
    VIDEO_INTERRUPTED: "Your session was interrupted. Stay focused!",
    POSE_SUBJECT_MISSING: "Stay visible to the camera.",
  },
  onRetry: [
    "Get back into your study position.",
    "Stay focused on your work.",
  ],
  completionMessage: "Study session complete! Great focus.",
};

const READ_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Make sure the text is clearly visible.",
    "Good lighting helps with text detection.",
  ],
  duringCapture: [
    "Hold the camera steady over the text.",
    "Keep the text flat and well-lit.",
  ],
  onFailure: {
    OCR_UNREADABLE: "We couldn't read the text clearly. Hold steady and try again.",
    OCR_TEXT_TOO_SHORT: "Not enough text was detected. Make sure the page is fully visible.",
    DOCUMENT_CROPPED: "Show the entire page or document.",
    DOCUMENT_SKEWED: "Hold the document flat and straight.",
  },
  onRetry: [
    "Place the document on a flat surface.",
    "Hold the camera directly above.",
    "Make sure all text is in frame.",
  ],
  completionMessage: "Text verified successfully!",
};

const WALK_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Make sure you have enough space to move.",
    "Your phone should be able to see you walking.",
  ],
  duringCapture: [
    "Walk at a natural pace.",
    "Stay visible to the camera.",
  ],
  onFailure: {
    OBJECT_NOT_DETECTED: "We couldn't detect your movement. Stay in frame.",
    POSE_SUBJECT_MISSING: "Move back so your full body is visible.",
  },
  onRetry: [
    "Walk at a steady pace.",
    "Stay within the camera view.",
  ],
  completionMessage: "Walking activity verified!",
};

const EXERCISE_GUIDANCE: MissionGuidance = {
  beforeStart: [
    "Set up your camera to see your full body.",
    "Make sure you have enough space.",
  ],
  duringCapture: [
    "Move naturally.",
    "Stay in frame.",
  ],
  onFailure: {
    POSE_SUBJECT_MISSING: "Move back so your full body is visible.",
    POSE_VELOCITY_INVALID: "Move at a natural, controlled pace.",
    VIDEO_INTERRUPTED: "Your session was interrupted. Please try again.",
  },
  onRetry: [
    "Get into position.",
    "Start when ready.",
  ],
  completionMessage: "Exercise completed! Great work.",
};

const MISSION_GUIDANCE_MAP: Record<string, MissionGuidance> = {
  pushup: PUSHUP_GUIDANCE,
  push_up: PUSHUP_GUIDANCE,
  pushups: PUSHUP_GUIDANCE,
  squat: SQUAT_GUIDANCE,
  squats: SQUAT_GUIDANCE,
  lunge: LUNGE_GUIDANCE,
  lunges: LUNGE_GUIDANCE,
  photo: PHOTO_GUIDANCE,
  clean: SCENE_GUIDANCE,
  organize: SCENE_GUIDANCE,
  tidy: SCENE_GUIDANCE,
  study: STUDY_GUIDANCE,
  read: READ_GUIDANCE,
  walk: WALK_GUIDANCE,
  exercise: EXERCISE_GUIDANCE,
  workout: EXERCISE_GUIDANCE,
};

export function getMissionGuidance(missionType: string): MissionGuidance {
  const key = missionType.toLowerCase().trim();
  return MISSION_GUIDANCE_MAP[key] || {
    beforeStart: ["Set up your camera and get ready."],
    duringCapture: ["Stay focused on your task."],
    onFailure: {
      UNKNOWN: "Something went wrong. Please try again.",
    },
    onRetry: ["Get back into position and try again."],
    completionMessage: "Mission completed!",
  };
}

export function getCoachingMessage(
  missionType: string,
  reasonCode: string
): string | null {
  const guidance = getMissionGuidance(missionType);
  return guidance.onFailure[reasonCode] || null;
}

export function getBeforeStartGuidance(missionType: string): string[] {
  return getMissionGuidance(missionType).beforeStart;
}

export function getDuringCaptureGuidance(missionType: string): string[] {
  return getMissionGuidance(missionType).duringCapture;
}

export function getCompletionMessage(missionType: string): string {
  return getMissionGuidance(missionType).completionMessage;
}
