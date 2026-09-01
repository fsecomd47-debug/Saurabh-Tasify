export type WorkerState = "idle" | "loading" | "ready" | "busy" | "error" | "terminated";

export interface WorkerTask {
  id: string;
  type: string;
  payload: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  startedAt: number;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  taskTimeoutMs: number;
  idleTimeoutMs: number;
}

const DEFAULT_CONFIG: WorkerPoolConfig = {
  maxWorkers: 2,
  taskTimeoutMs: 30000,
  idleTimeoutMs: 60000,
};

export class WorkerLifecycleManager {
  private workers: Map<string, {
    worker: Worker;
    state: WorkerState;
    currentTask: WorkerTask | null;
    createdAt: number;
    lastActiveAt: number;
  }> = new Map();
  private taskQueue: WorkerTask[] = [];
  private config: WorkerPoolConfig;
  private taskIdCounter = 0;

  constructor(config?: Partial<WorkerPoolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createWorker(scriptUrl: string): Promise<string> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const worker = new Worker(scriptUrl);

    const entry = {
      worker,
      state: "ready" as WorkerState,
      currentTask: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.workers.set(workerId, entry);

    worker.onmessage = (e) => {
      this.handleMessage(workerId, e.data);
    };

    worker.onerror = (e) => {
      this.handleError(workerId, e);
    };

    return workerId;
  }

  async loadModel(
    workerId: string,
    modelUrl: string,
    config?: Record<string, unknown>
  ): Promise<void> {
    const entry = this.workers.get(workerId);
    if (!entry) throw new Error(`Worker ${workerId} not found`);

    entry.state = "loading";

    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const timeout = setTimeout(() => {
        reject(new Error("Model loading timed out"));
      }, this.config.taskTimeoutMs);

      const originalHandler = entry.worker.onmessage;
      const handleEvent = (e: MessageEvent) => {
        if (e.data.type === "model-loaded") {
          clearTimeout(timeout);
          entry.state = "ready";
          entry.worker.onmessage = originalHandler;
          resolve();
        } else if (e.data.type === "error") {
          clearTimeout(timeout);
          entry.state = "error";
          entry.worker.onmessage = originalHandler;
          reject(new Error(e.data.message));
        } else if (originalHandler) {
          originalHandler.call(entry.worker, e);
        }
      };
      entry.worker.onmessage = handleEvent;

      entry.worker.postMessage({
        type: "load-model",
        modelUrl,
        config,
      });
    });
  }

  async executeTask<T>(
    workerId: string,
    taskType: string,
    payload: unknown,
    transferables?: Transferable[]
  ): Promise<T> {
    const entry = this.workers.get(workerId);
    if (!entry) throw new Error(`Worker ${workerId} not found`);

    if (entry.state !== "ready") {
      throw new Error(`Worker ${workerId} is not ready (state: ${entry.state})`);
    }

    return new Promise<T>((resolve, reject) => {
      const taskId = this.generateTaskId();
      entry.state = "busy";
      entry.lastActiveAt = Date.now();

      const timeout = setTimeout(() => {
        entry.state = "error";
        reject(new Error(`Task timed out after ${this.config.taskTimeoutMs}ms`));
      }, this.config.taskTimeoutMs);

      const task: WorkerTask = {
        id: taskId,
        type: taskType,
        payload,
        resolve: (result) => {
          clearTimeout(timeout);
          entry.state = "ready";
          entry.currentTask = null;
          resolve(result as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          entry.state = "error";
          entry.currentTask = null;
          reject(error);
        },
        startedAt: Date.now(),
      };

      entry.currentTask = task;

      if (transferables && transferables.length > 0) {
        entry.worker.postMessage(
          { taskId, type: taskType, payload },
          transferables
        );
      } else {
        entry.worker.postMessage({ taskId, type: taskType, payload });
      }
    });
  }

  private handleMessage(workerId: string, data: {
    taskId?: string;
    type: string;
    result?: unknown;
    error?: string;
  }): void {
    const entry = this.workers.get(workerId);
    if (!entry || !entry.currentTask) return;

    if (data.type === "result" && data.taskId === entry.currentTask.id) {
      entry.currentTask.resolve(data.result);
    } else if (data.type === "error" && data.taskId === entry.currentTask.id) {
      entry.currentTask.reject(new Error(data.error || "Unknown worker error"));
    }
  }

  private handleError(workerId: string, error: ErrorEvent): void {
    const entry = this.workers.get(workerId);
    if (!entry) return;

    entry.state = "error";

    if (entry.currentTask) {
      entry.currentTask.reject(new Error(error.message || "Worker error"));
      entry.currentTask = null;
    }
  }

  terminateWorker(workerId: string): void {
    const entry = this.workers.get(workerId);
    if (!entry) return;

    if (entry.currentTask) {
      entry.currentTask.reject(new Error("Worker terminated"));
    }

    entry.worker.terminate();
    entry.state = "terminated";
    this.workers.delete(workerId);
  }

  terminateAll(): void {
    for (const [workerId] of this.workers) {
      this.terminateWorker(workerId);
    }
  }

  cleanupIdle(): void {
    const now = Date.now();
    for (const [workerId, entry] of this.workers) {
      if (
        entry.state === "ready" &&
        now - entry.lastActiveAt > this.config.idleTimeoutMs
      ) {
        this.terminateWorker(workerId);
      }
    }
  }

  getWorkerState(workerId: string): WorkerState | undefined {
    return this.workers.get(workerId)?.state;
  }

  getActiveWorkerCount(): number {
    let count = 0;
    for (const entry of this.workers.values()) {
      if (entry.state === "ready" || entry.state === "busy") count++;
    }
    return count;
  }

  canCreateWorker(): boolean {
    return this.getActiveWorkerCount() < this.config.maxWorkers;
  }

  private generateTaskId(): string {
    return `task-${++this.taskCounter}-${Date.now()}`;
  }

  private taskCounter = 0;
}

let globalWorkerPool: WorkerLifecycleManager | null = null;

export function getWorkerPool(): WorkerLifecycleManager {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerLifecycleManager();
  }
  return globalWorkerPool;
}

export function resetWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.terminateAll();
    globalWorkerPool = null;
  }
}
