/**
 * PDR-4.1 §29-30: Camera Consent UX
 * Policy-dependent camera permission request.
 * Shows explanation before requesting camera access.
 */

"use client";

import React from "react";

type CameraConsentProps = {
  missionTitle: string;
  verificationDescription: string;
  onAllow: () => void;
  onContinueWithout?: () => void;
  requiresCamera: boolean;
};

export function CameraConsent({
  missionTitle,
  verificationDescription,
  onAllow,
  onContinueWithout,
  requiresCamera,
}: CameraConsentProps) {
  return (
    <div className="bg-neutral-900 rounded-xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h3 className="text-white text-xl font-semibold mb-2">Camera Verification</h3>
        <p className="text-neutral-400 text-sm">
          {verificationDescription}
        </p>
      </div>

      {/* Privacy info */}
      <div className="bg-neutral-800 rounded-lg p-4 mb-6">
        <h4 className="text-white text-sm font-medium mb-2">How it works:</h4>
        <ul className="space-y-2 text-neutral-400 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Camera is only active during this mission</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>No video is recorded or stored</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Processing happens on your device</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>You can stop the camera at any time</span>
          </li>
        </ul>
      </div>

      {/* Mission info */}
      <div className="bg-neutral-800/50 rounded-lg p-3 mb-6">
        <div className="text-neutral-300 text-sm font-medium">{missionTitle}</div>
        <div className="text-neutral-500 text-xs mt-1">
          Camera required for this verification
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onAllow}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-semibold"
        >
          Allow Camera
        </button>

        {!requiresCamera && onContinueWithout && (
          <button
            onClick={onContinueWithout}
            className="w-full py-3 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors text-sm"
          >
            Continue Without Camera
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="text-neutral-600 text-xs text-center mt-4">
        You can revoke camera access at any time in your browser settings.
      </p>
    </div>
  );
}
