import type { AIProvider, MissionInput, TaskAnalysis } from "./provider";
import { TASK_ANALYSIS_SYSTEM_PROMPT, buildTaskAnalysisPrompt } from "./prompts/task-analysis";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Groq AI provider — uses free llama-3.3-70b-versatile model.
 * API is OpenAI-compatible.
 */
export class GrokProvider implements AIProvider {
  readonly name = "groq";

  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey ?? process.env.GROQ_API_KEY ?? "";
    this.model = config?.model ?? process.env.GROQ_MODEL ?? "qwen/qwen3.6-27b";
    this.baseUrl = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
  }

  async analyzeTask(input: MissionInput): Promise<TaskAnalysis> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const messages: ChatMessage[] = [
      { role: "system", content: TASK_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: buildTaskAnalysisPrompt(input.title, input.description) },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    // Clean response — remove <think>...</think> tags if present (Qwen models)
    // Also handle unclosed think tags
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    content = content.replace(/<think>[\s\S]*$/g, "").trim();

    // Extract JSON if wrapped in markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(content);
    return this.validateAnalysis(parsed);
  }

  private validateAnalysis(raw: Record<string, unknown>): TaskAnalysis {
    const validCategories = ["study", "work", "fitness", "reading", "health", "creative", "personal", "finance", "other"];
    const validDifficulties = ["easy", "medium", "hard", "elite"];
    const validActivityTypes = ["repetition", "focus", "timer", "visual_result", "external_result", "simple"];
    const validVerificationModes = [
      "self_reported", "timed", "focus", "pose", "repetition",
      "interactive", "evidence", "hybrid", "activity_signal", "review", "photo",
    ];

    // Safety-net: if AI returns an activityType as category, map it to the correct category
    const categoryMap: Record<string, string> = {
      external_result: "finance",
      repetition: "fitness",
      focus: "study",
      visual_result: "personal",
      simple: "personal",
      timer: "other",
    };
    const rawCategory = String(raw.category || "");
    let category: TaskAnalysis["category"];
    if (validCategories.includes(rawCategory)) {
      category = rawCategory as TaskAnalysis["category"];
    } else if (categoryMap[rawCategory]) {
      category = categoryMap[rawCategory] as TaskAnalysis["category"];
    } else {
      category = "other";
    }

    const difficulty = validDifficulties.includes(raw.difficulty as string)
      ? (raw.difficulty as TaskAnalysis["difficulty"])
      : "medium";

    const activityType = validActivityTypes.includes(raw.activityType as string)
      ? (raw.activityType as TaskAnalysis["activityType"])
      : "timer";

    // For finance tasks with external_result, default to evidence verification
    let verificationMode = validVerificationModes.includes(raw.verificationMode as string)
      ? (raw.verificationMode as TaskAnalysis["verificationMode"])
      : "self_reported";

    if (category === "finance" && activityType === "external_result" && verificationMode === "review") {
      verificationMode = "evidence";
    }

    return {
      canonicalActivity: String(raw.canonicalActivity || "unknown"),
      category,
      difficulty,
      estimatedMinutes: Math.max(1, Math.min(480, Number(raw.estimatedMinutes) || 30)),
      activityType,
      verificationMode,
      target: raw.target as { value?: number; unit?: string } | undefined,
      verificationRequirements: (raw.verificationRequirements as Record<string, unknown>) ?? {},
      normalizedTitle: String(raw.normalizedTitle || "").slice(0, 80),
      confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.7)),
    };
  }
}
