import "server-only";

type MailInput = { to: string; subject: string; html: string };

export type MailResult = { delivered: boolean };

/**
 * Email transport. Uses Resend when RESEND_API_KEY is configured;
 * otherwise falls back to a console transport for local development
 * (links are logged — never silently swallowed).
 */
export async function sendMail({ to, subject, html }: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev transport: surface the email content in server logs.
    console.log("\n─────────── DEV EMAIL (no RESEND_API_KEY) ───────────");
    console.log(`TO: ${to}\nSUBJECT: ${subject}`);
    const link = html.match(/href="([^"]+)"/)?.[1];
    if (link) console.log(`ACTION LINK: ${link}`);
    console.log("──────────────────────────────────────────────────────\n");
    return { delivered: false };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SaurabhTask <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (result.error) throw new Error(result.error.message);
    return { delivered: true };
  } catch (err) {
    console.error("[email] provider send failed — falling back to dev transport:", err instanceof Error ? err.message : err);
    console.log(`[email] ACTION LINK (dev): ${html.match(/href="([^"]+)"/)?.[1] ?? "(n/a)"} → ${to}`);
    return { delivered: false };
  }
}

function shell(title: string, body: string, cta: string, url: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0812;font-family:-apple-system,'Segoe UI',Inter,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#120e1d;border-radius:24px;overflow:hidden;border:1px solid rgba(124,92,255,.25);">
    <div style="padding:36px 36px 8px;">
      <p style="color:#9A7CFF;font-weight:800;letter-spacing:.18em;font-size:12px;margin:0 0 18px;">SAURABHTASK</p>
      <h1 style="color:#fff;font-size:26px;line-height:1.25;margin:0 0 14px;">${title}</h1>
      <p style="color:#a5a0b8;font-size:15px;line-height:1.6;margin:0 0 28px;">${body}</p>
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7C5CFF,#9A7CFF);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 34px;border-radius:14px;">${cta}</a>
    </div>
    <p style="color:#5f5975;font-size:12px;padding:26px 36px 30px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  </div></body></html>`;
}

export function verificationEmail(url: string): { subject: string; html: string } {
  return {
    subject: "Verify your SaurabhTask identity",
    html: shell(
      "Verify your identity",
      "One quick click and your SaurabhTask player profile is ready to build.",
      "VERIFY IDENTITY",
      url
    ),
  };
}

export function resetEmail(url: string): { subject: string; html: string } {
  return {
    subject: "Reset your SaurabhTask password",
    html: shell(
      "Reset your password",
      "This secure link expires in 60 minutes and can be used once.",
      "RESET PASSWORD",
      url
    ),
  };
}
