import { resend, EMAIL_FROM, APP_URL } from "@/server/lib/email";

/* ───────────────────── Shared Styles ───────────────────── */

const BASE_STYLE = `
  margin: 0;
  padding: 0;
  background-color: #0a0a14;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const CONTAINER_STYLE = `
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const CARD_STYLE = `
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 32px;
  text-align: center;
`;

const BUTTON_STYLE = `
  display: inline-block;
  background: linear-gradient(135deg, #7C5CFF 0%, #9A7CFF 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 14px;
  letter-spacing: 0.5px;
  margin: 24px 0;
`;

const FOOTER_STYLE = `
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
`;

/* ───────────────────── Verification Email ───────────────────── */

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — SaurabhTask</title>
</head>
<body style="${BASE_STYLE}">
  <div style="${CONTAINER_STYLE}">
    <!-- Glow effect -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="
        display: inline-block;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: linear-gradient(135deg, #7C5CFF 0%, #9A7CFF 100%);
        box-shadow: 0 0 40px rgba(124, 92, 255, 0.4);
        line-height: 64px;
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      ">S</div>
    </div>

    <div style="${CARD_STYLE}">
      <h1 style="
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        margin: 0 0 8px 0;
        line-height: 1.2;
      ">VERIFY YOUR EMAIL</h1>

      <p style="
        color: #9CA3AF;
        font-size: 14px;
        margin: 0 0 32px 0;
        line-height: 1.5;
      ">
        Click the button below to verify your email address and activate your SaurabhTask account.
      </p>

      <a href="${verifyUrl}" style="${BUTTON_STYLE}">
        VERIFY EMAIL
      </a>

      <p style="
        color: #6B7280;
        font-size: 12px;
        margin: 16px 0 0 0;
        line-height: 1.5;
      ">
        This link expires in 24 hours.
      </p>
    </div>

    <div style="${FOOTER_STYLE}">
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p style="margin-top: 8px;">
        <a href="${APP_URL}" style="color: #9A7CFF; text-decoration: none;">SaurabhTask</a>
        — Your productivity becomes your wealth.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Verify your email — SaurabhTask",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email/verification]", err);
    return { success: false, error: "Failed to send verification email." };
  }
}

/* ───────────────────── Password Reset Email ───────────────────── */

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — SaurabhTask</title>
</head>
<body style="${BASE_STYLE}">
  <div style="${CONTAINER_STYLE}">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="
        display: inline-block;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: linear-gradient(135deg, #7C5CFF 0%, #9A7CFF 100%);
        box-shadow: 0 0 40px rgba(124, 92, 255, 0.4);
        line-height: 64px;
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      ">S</div>
    </div>

    <div style="${CARD_STYLE}">
      <h1 style="
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        margin: 0 0 8px 0;
        line-height: 1.2;
      ">RESET YOUR PASSWORD</h1>

      <p style="
        color: #9CA3AF;
        font-size: 14px;
        margin: 0 0 32px 0;
        line-height: 1.5;
      ">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>

      <a href="${resetUrl}" style="${BUTTON_STYLE}">
        RESET PASSWORD
      </a>

      <p style="
        color: #6B7280;
        font-size: 12px;
        margin: 16px 0 0 0;
        line-height: 1.5;
      ">
        This link expires in 1 hour.
      </p>
    </div>

    <div style="${FOOTER_STYLE}">
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <p style="margin-top: 8px;">
        <a href="${APP_URL}" style="color: #9A7CFF; text-decoration: none;">SaurabhTask</a>
        — Your productivity becomes your wealth.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Reset your password — SaurabhTask",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email/password-reset]", err);
    return { success: false, error: "Failed to send password reset email." };
  }
}

/* ───────────────────── Welcome Email ───────────────────── */

export async function sendWelcomeEmail(
  email: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SaurabhTask</title>
</head>
<body style="${BASE_STYLE}">
  <div style="${CONTAINER_STYLE}">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="
        display: inline-block;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: linear-gradient(135deg, #7C5CFF 0%, #9A7CFF 100%);
        box-shadow: 0 0 40px rgba(124, 92, 255, 0.4);
        line-height: 64px;
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      ">S</div>
    </div>

    <div style="${CARD_STYLE}">
      <h1 style="
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        margin: 0 0 8px 0;
        line-height: 1.2;
      ">WELCOME, ${displayName.toUpperCase()}!</h1>

      <p style="
        color: #9CA3AF;
        font-size: 14px;
        margin: 0 0 24px 0;
        line-height: 1.5;
      ">
        Your productivity journey starts now. Complete tasks, earn ST, and climb the leaderboard.
      </p>

      <a href="${APP_URL}/home" style="${BUTTON_STYLE}">
        ENTER SAURABHTASK
      </a>
    </div>

    <div style="${FOOTER_STYLE}">
      <p>
        <a href="${APP_URL}" style="color: #9A7CFF; text-decoration: none;">SaurabhTask</a>
        — Your productivity becomes your wealth.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Welcome to SaurabhTask 🎉",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email/welcome]", err);
    return { success: false, error: "Failed to send welcome email." };
  }
}
