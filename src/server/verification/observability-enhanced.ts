/**
 * PDR-4 §124-125: Comprehensive Observability + Alerting
 * Tracks verification system health, performance metrics,
 * and generates alerts for anomalies.
 */

import "server-only";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { activityEvents, missions } from "@/db/schema";

export type MetricType =
  | "provider_load_time"
  | "inference_time"
  | "verification_duration"
  | "uncertainty_rate"
  | "camera_failure"
  | "evidence_rejection"
  | "mission_abandonment"
  | "retry_rate"
  | "settlement_success"
  | "model_latency";

export type AlertSeverity = "info" | "warning" | "critical";

export type Alert = {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

/**
 * §124: Record a performance metric.
 */
export async function recordMetric(
  metricType: MetricType,
  value: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(activityEvents).values({
    userId: "system",
    type: "METRIC",
    entityId: metricType,
    metadata: {
      metricType,
      value,
      timestamp: Date.now(),
      ...metadata,
    },
  });
}

/**
 * §124: Get aggregate metrics for a time window.
 */
export async function getMetricsSummary(
  metricType: MetricType,
  windowMinutes: number = 60
): Promise<{
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const events = await db.select({ metadata: activityEvents.metadata })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.type, "METRIC"),
      sql`(activity_events.metadata->>'metricType') = ${metricType}`,
      sql`${activityEvents.createdAt} >= ${windowStart.toISOString()}`
    ))
    .limit(1000);

  const values = events
    .map((e) => (e.metadata as Record<string, unknown>)?.value as number)
    .filter((v) => typeof v === "number" && !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 };
  }

  const sum = values.reduce((s, v) => s + v, 0);
  const p95Idx = Math.floor(values.length * 0.95);
  const p99Idx = Math.floor(values.length * 0.99);

  return {
    count: values.length,
    average: Math.round((sum / values.length) * 100) / 100,
    min: values[0],
    max: values[values.length - 1],
    p95: values[p95Idx] ?? values[values.length - 1],
    p99: values[p99Idx] ?? values[values.length - 1],
  };
}

/**
 * §125: Check for alert conditions.
 * Returns alerts that exceed configured thresholds.
 */
export async function checkAlerts(windowMinutes: number = 60): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // §125: Camera failure spike
  const cameraFailures = await getMetricsSummary("camera_failure", windowMinutes);
  if (cameraFailures.count > 10) {
    alerts.push({
      id: `camera_failure_${Date.now()}`,
      severity: "warning",
      type: "camera_failure_spike",
      message: `High camera failure rate: ${cameraFailures.count} failures in ${windowMinutes}min`,
      metric: "camera_failure",
      value: cameraFailures.count,
      threshold: 10,
      timestamp: new Date().toISOString(),
    });
  }

  // §125: Model latency regression
  const modelLatency = await getMetricsSummary("model_latency", windowMinutes);
  if (modelLatency.p95 > 500) {
    alerts.push({
      id: `model_latency_${Date.now()}`,
      severity: "warning",
      type: "model_latency_regression",
      message: `Model latency P95 is ${modelLatency.p95}ms (threshold: 500ms)`,
      metric: "model_latency",
      value: modelLatency.p95,
      threshold: 500,
      timestamp: new Date().toISOString(),
    });
  }

  // §125: High uncertainty rate
  const uncertainty = await getMetricsSummary("uncertainty_rate", windowMinutes);
  if (uncertainty.average > 0.3) {
    alerts.push({
      id: `uncertainty_${Date.now()}`,
      severity: "warning",
      type: "high_uncertainty_rate",
      message: `Uncertainty rate is ${Math.round(uncertainty.average * 100)}% (threshold: 30%)`,
      metric: "uncertainty_rate",
      value: uncertainty.average,
      threshold: 0.3,
      timestamp: new Date().toISOString(),
    });
  }

  // §125: Evidence rejection spike
  const rejections = await getMetricsSummary("evidence_rejection", windowMinutes);
  if (rejections.count > 20) {
    alerts.push({
      id: `evidence_rejection_${Date.now()}`,
      severity: "info",
      type: "evidence_rejection_spike",
      message: `High evidence rejection rate: ${rejections.count} rejections in ${windowMinutes}min`,
      metric: "evidence_rejection",
      value: rejections.count,
      threshold: 20,
      timestamp: new Date().toISOString(),
    });
  }

  // §125: Settlement failure detection
  const settlement = await getMetricsSummary("settlement_success", windowMinutes);
  if (settlement.count > 0 && settlement.average < 0.9) {
    alerts.push({
      id: `settlement_failure_${Date.now()}`,
      severity: "critical",
      type: "settlement_failure_rate",
      message: `Settlement success rate is ${Math.round(settlement.average * 100)}% (threshold: 90%)`,
      metric: "settlement_success",
      value: settlement.average,
      threshold: 0.9,
      timestamp: new Date().toISOString(),
    });
  }

  // §125: Mission abandonment detection
  const abandonment = await getMetricsSummary("mission_abandonment", windowMinutes);
  if (abandonment.count > 15) {
    alerts.push({
      id: `abandonment_${Date.now()}`,
      severity: "warning",
      type: "high_abandonment_rate",
      message: `High mission abandonment: ${abandonment.count} abandonments in ${windowMinutes}min`,
      metric: "mission_abandonment",
      value: abandonment.count,
      threshold: 15,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * §125: Get system health overview.
 */
export async function getSystemHealth(): Promise<{
  status: "healthy" | "degraded" | "critical";
  metrics: Record<MetricType, { count: number; average: number }>;
  alerts: Alert[];
  uptime: number;
}> {
  const metricTypes: MetricType[] = [
    "provider_load_time", "inference_time", "verification_duration",
    "uncertainty_rate", "camera_failure", "evidence_rejection",
    "mission_abandonment", "retry_rate", "settlement_success", "model_latency",
  ];

  const metricsSummary: Record<string, { count: number; average: number }> = {};
  for (const mt of metricTypes) {
    const summary = await getMetricsSummary(mt, 60);
    metricsSummary[mt] = { count: summary.count, average: summary.average };
  }

  const alerts = await checkAlerts(60);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  let status: "healthy" | "degraded" | "critical" = "healthy";
  if (criticalAlerts.length > 0) status = "critical";
  else if (warningAlerts.length > 2) status = "degraded";

  return {
    status,
    metrics: metricsSummary as Record<MetricType, { count: number; average: number }>,
    alerts,
    uptime: process.uptime(),
  };
}
