export type CancellationReason =
  | "user_cancelled"
  | "session_expired"
  | "timeout"
  | "error"
  | "camera_lost"
  | "permission_revoked"
  | "network_lost"
  | "system_event";

export interface CancellableOperation {
  id: string;
  abortController: AbortController;
  reason: CancellationReason | null;
  cancelledAt: number | null;
  cleanup: () => Promise<void>;
}

export class CancellationManager {
  private operations: Map<string, CancellableOperation> = new Map();
  private globalAbortController: AbortController | null = null;

  createOperation(
    operationId: string,
    cleanup: () => Promise<void>
  ): AbortSignal {
    const abortController = new AbortController();

    this.operations.set(operationId, {
      id: operationId,
      abortController,
      reason: null,
      cancelledAt: null,
      cleanup,
    });

    return abortController.signal;
  }

  cancelOperation(
    operationId: string,
    reason: CancellationReason
  ): boolean {
    const op = this.operations.get(operationId);
    if (!op) return false;

    if (op.reason !== null) return false;

    op.reason = reason;
    op.cancelledAt = Date.now();
    op.abortController.abort();

    op.cleanup().catch(() => {});

    this.operations.delete(operationId);
    return true;
  }

  cancelAll(reason: CancellationReason): void {
    for (const [operationId] of this.operations) {
      this.cancelOperation(operationId, reason);
    }
  }

  cancelByReason(reason: CancellationReason): string[] {
    const cancelled: string[] = [];
    for (const [operationId, op] of this.operations) {
      if (op.reason === null) {
        this.cancelOperation(operationId, reason);
        cancelled.push(operationId);
      }
    }
    return cancelled;
  }

  isCancelled(operationId: string): boolean {
    const op = this.operations.get(operationId);
    return op?.reason !== null || false;
  }

  getOperation(operationId: string): CancellableOperation | undefined {
    return this.operations.get(operationId);
  }

  getActiveOperations(): string[] {
    return Array.from(this.operations.keys()).filter((id) => {
      const op = this.operations.get(id);
      return op?.reason === null;
    });
  }

  createGlobalSignal(): AbortSignal {
    this.globalAbortController = new AbortController();
    return this.globalAbortController.signal;
  }

  cancelGlobal(reason: CancellationReason): void {
    if (this.globalAbortController) {
      this.globalAbortController.abort();
      this.globalAbortController = null;
    }
    this.cancelAll(reason);
  }

  onCancellation(
    operationId: string,
    callback: (reason: CancellationReason) => void
  ): () => void {
    const op = this.operations.get(operationId);
    if (!op) return () => {};

    const originalAbort = op.abortController.abort.bind(op.abortController);
    op.abortController.abort = () => {
      originalAbort();
      if (op.reason) callback(op.reason);
    };

    return () => {};
  }

  cleanup(): void {
    this.cancelAll("user_cancelled");
    this.globalAbortController = null;
  }
}

let globalCancellationManager: CancellationManager | null = null;

export function getCancellationManager(): CancellationManager {
  if (!globalCancellationManager) {
    globalCancellationManager = new CancellationManager();
  }
  return globalCancellationManager;
}

export function resetCancellationManager(): void {
  if (globalCancellationManager) {
    globalCancellationManager.cleanup();
    globalCancellationManager = null;
  }
}
