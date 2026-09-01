import { NextRequest, NextResponse } from "next/server";
import { VerificationPipeline } from "../../../../server/verification/verification-pipeline";
import { initializeProviders } from "../../../../server/verification/providers";
import type { MissionVerificationRequest } from "../../../../types/evidence";

initializeProviders();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = [
      "missionId",
      "userId",
      "sessionId",
      "sessionNonce",
      "evidenceManifest",
      "clientMetadata",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const verificationRequest: MissionVerificationRequest = {
      missionId: body.missionId,
      userId: body.userId,
      sessionId: body.sessionId,
      sessionNonce: body.sessionNonce,
      evidenceManifest: {
        sessionId: body.evidenceManifest.sessionId,
        missionId: body.evidenceManifest.missionId,
        userId: body.evidenceManifest.userId,
        nonce: body.evidenceManifest.nonce,
        livenessToken: body.evidenceManifest.livenessToken,
        submittedAt: new Date(body.evidenceManifest.submittedAt),
        evidenceItems: body.evidenceManifest.evidenceItems,
      },
      providerSignals: body.providerSignals || [],
      clientMetadata: {
        startedAt: body.clientMetadata.startedAt,
        completedAt: body.clientMetadata.completedAt,
        durationMs: body.clientMetadata.durationMs,
        deviceInfo: body.clientMetadata.deviceInfo,
      },
    };

    const result = await VerificationPipeline.processVerification(
      verificationRequest
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error("[VerifyV2] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        verdict: "rejected",
        confidence: 0,
        providerResults: [],
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const missionId = searchParams.get("missionId");

  if (!missionId) {
    return NextResponse.json(
      { success: false, error: "missionId required" },
      { status: 400 }
    );
  }

  try {
    const summary = await VerificationPipeline.getEvidenceSummary(missionId);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
