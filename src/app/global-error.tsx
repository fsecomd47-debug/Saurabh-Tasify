"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '"Geist Mono:SemiBold", monospace',
          margin: 0,
        }}
      >
        <div
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F9FAFB",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <span style={{ fontSize: 48 }}>⚠️</span>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "#1C1C1E",
                marginTop: 16,
              }}
            >
              Something went off-script.
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#8E8E93",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              Your progress is safe. Try again.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 24,
                padding: "12px 32px",
                borderRadius: 999,
                background: "#5E5CE6",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
