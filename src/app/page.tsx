import Link from "next/link";

const FEATURES = [
  {
    icon: "streaks",
    title: "Streaks",
    desc: "Grow your multiplier every day you show up. Consistency is the real currency.",
    circleBg: "#FFF0E5",
    iconColor: "#FF9500",
  },
  {
    icon: "leaderboard",
    title: "Leaderboard",
    desc: "Out-earn real rivals. Climb the ranks and prove who owns the grind.",
    circleBg: "#EDEDFC",
    iconColor: "#5E5CE6",
  },
  {
    icon: "vault",
    title: "Vault",
    desc: "Spend your fortune on exclusive frames, titles and powerful boosts.",
    circleBg: "#E5F5EA",
    iconColor: "#34C759",
  },
];

function FeatureIcon({ name, color }: { name: string; color: string }) {
  if (name === "streaks") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M11.7 1.3c-.4-.5-1.1-.6-1.6-.2C7 3.6 4.5 7.4 4.5 11.8 4.5 17.4 7.7 21 12 23c4.3-2 7.5-5.6 7.5-11.2 0-4.4-2.5-8.2-5.6-10.7-.5-.4-1.2-.3-1.6.2l-.6.9zM12 21.5c-2.8 0-5.5-3-5.5-7.8 0-2.8 1.7-5.5 3.7-7.2.3-.3.8-.2 1 .1 1.5 1.6 2.8 3.7 2.8 5.9 0 3.5-1 6.2-2 9z" />
      </svg>
    );
  }
  if (name === "leaderboard") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M12 15.4A5.4 5.4 0 1 0 12 4.6a5.4 5.4 0 0 0 0 10.8zM17 2H7v2h10V2zm-1 6h-2V4h2v4zm2 6c-.8 0-1.5-.2-2.1-.5L14 10.5V8c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v2.5L7.1 13.5c-.6.3-1.3.5-2.1.5-2.8 0-5 2.2-5 5s2.2 5 5 5h8c2.8 0 5-2.2 5-5s-2.2-5-5-5z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L3 6.5v5c0 5.2 3.8 10 9 11.2 5.2-1.2 9-6 9-11.2v-5L12 2z" />
    </svg>
  );
}

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';

export default function LandingPage() {
  return (
    <main className="min-h-full relative flex flex-col overflow-hidden" style={{ background: "#F2F2F7" }}>
      {/* Navigation Bar — 44px native iOS bar */}
      <header
        className="relative z-10 flex items-center justify-between"
        style={{ height: 44, padding: "0 20px" }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#1C1C1E",
            fontFamily: SF,
          }}
        >
          SAURABHTASK
        </span>
        <Link
          href="/login"
          className="flex items-center transition-colors"
          style={{
            color: "#007AFF",
            fontWeight: 600,
            fontSize: 15,
            fontFamily: SF,
            height: 44,
            alignItems: "center",
          }}
        >
          Sign in
        </Link>
      </header>

      {/* Hero — 24px gap below nav, then content */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-6 pb-0">
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "#8E8E93", textTransform: "uppercase" as const, fontFamily: SF, marginBottom: 20 }}>
          LEVEL UP &middot; EARN ST &middot; BUILD STREAKS
        </p>
        <h1 style={{ fontFamily: SF, fontWeight: 800, fontSize: 30, lineHeight: 1.12, letterSpacing: "-0.04em", color: "#1D1D1F" }}>
          YOUR PRODUCTIVITY<br />BECOMES YOUR WEALTH.
        </h1>
        <p style={{ maxWidth: 280, margin: "14px auto 0", fontSize: 15, fontWeight: 400, lineHeight: 1.4, color: "#3A3A3C", fontFamily: SF }}>
          Turn daily missions into a persistent fortune of tokens, XP and status. Your progress lives here &mdash; forever.
        </p>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6" style={{ marginBottom: 40, marginTop: 32 }}>
        <div className="w-full max-w-md mx-auto">
          <Link href="/start" className="flex items-center justify-center w-full transition-all"
            style={{ minHeight: 56, borderRadius: 9999, background: "#1D1D1F", color: "#FFFFFF", fontSize: 17, fontWeight: 600, letterSpacing: "0.01em", padding: "16px 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontFamily: SF }}>
            Get Started
          </Link>
          <Link href="/login" className="flex items-center justify-center w-full transition-colors"
            style={{ marginTop: 16, minHeight: 48, fontSize: 16, fontWeight: 500, color: "#007AFF", fontFamily: SF }}>
            I already have a player
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 px-6 pb-10" style={{ marginTop: 8 }}>
        <div className="w-full max-w-md mx-auto" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center w-full"
              style={{ background: "#FFFFFF", borderRadius: 16, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="flex-shrink-0 flex items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: "50%", background: f.circleBg }}>
                <FeatureIcon name={f.icon} color={f.iconColor} />
              </div>
              <div className="flex-1 min-w-0" style={{ marginLeft: 16, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
                <p style={{ fontWeight: 600, fontSize: 16, color: "#1C1C1E", fontFamily: SF }}>{f.title}</p>
                <p style={{ fontWeight: 400, fontSize: 13, lineHeight: 1.3, color: "#8E8E93", fontFamily: SF }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 pb-8 text-center">
        <p style={{ fontSize: 12, color: "#86868B", fontFamily: SF }}>Free to join &middot; Your player state is saved server-side</p>
      </footer>
    </main>
  );
}
