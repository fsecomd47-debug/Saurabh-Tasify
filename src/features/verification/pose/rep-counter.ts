export type RepState = "ready" | "descending" | "bottom_confirmed" | "ascending" | "top_confirmed";

export type RepEvent = {
  repCount: number;
  state: RepState;
  formScore: number;
  timestamp: number;
};

export type RepCounterConfig = {
  targetReps: number;
  onRep?: (quality: number) => void;
  onFormFeedback?: (feedback: string) => void;
};

/**
 * Repetition counting state machine.
 * Tracks joint angles to count valid reps (PDR-3 §26).
 *
 * States:
 * READY → DESCENDING → BOTTOM_CONFIRMED → ASCENDING → TOP_CONFIRMED → REP++ → READY
 */
export class RepCounter {
  private targetReps: number;
  private state: RepState = "ready";
  private repCount: number = 0;
  private formScore: number = 1.0;
  private angleHistory: number[] = [];
  private onRep?: (quality: number) => void;
  private onFormFeedback?: (feedback: string) => void;

  // Configurable thresholds
  private bottomAngle: number = 70;   // Elbow angle at bottom
  private topAngle: number = 160;     // Elbow angle at top (full extension)
  private angleBuffer: number = 10;   // Tolerance

  constructor(config: RepCounterConfig) {
    this.targetReps = config.targetReps;
    this.onRep = config.onRep;
    this.onFormFeedback = config.onFormFeedback;
  }

  /**
   * Process a new pose frame with elbow angle.
   * Returns true if a new rep was counted.
   */
  processFrame(elbowAngle: number, bodyVisible: boolean): RepEvent {
    if (!bodyVisible) {
      return this.getEvent();
    }

    this.angleHistory.push(elbowAngle);
    if (this.angleHistory.length > 30) {
      this.angleHistory.shift();
    }

    switch (this.state) {
      case "ready":
        if (elbowAngle < this.topAngle + this.angleBuffer) {
          this.state = "descending";
        }
        break;

      case "descending":
        if (elbowAngle < this.bottomAngle + this.angleBuffer) {
          this.state = "bottom_confirmed";
        }
        break;

      case "bottom_confirmed":
        if (elbowAngle > this.bottomAngle + this.angleBuffer) {
          this.state = "ascending";
        }
        break;

      case "ascending":
        if (elbowAngle > this.topAngle - this.angleBuffer) {
          this.state = "top_confirmed";
          this.repCount++;
          const quality = this.updateFormScore(elbowAngle);
          this.onRep?.(quality);
          this.state = "ready";
        }
        break;

      case "top_confirmed":
        this.state = "ready";
        break;
    }

    return this.getEvent();
  }

  private updateFormScore(extensionAngle: number): number {
    // Score based on how close to full extension
    const extensionPct = Math.min(1, extensionAngle / this.topAngle);
    const quality = 0.7 + extensionPct * 0.3;
    
    if (quality < 0.6) {
      this.onFormFeedback?.("Go lower on the next rep");
    } else if (quality < 0.8) {
      this.onFormFeedback?.("Good form!");
    }
    
    return quality;
  }

  private getEvent(): RepEvent {
    return {
      repCount: this.repCount,
      state: this.state,
      formScore: this.formScore,
      timestamp: Date.now(),
    };
  }

  getRepCount(): number {
    return this.repCount;
  }

  isComplete(): boolean {
    return this.repCount >= this.targetReps;
  }

  reset(): void {
    this.state = "ready";
    this.repCount = 0;
    this.formScore = 1.0;
    this.angleHistory = [];
  }
}
