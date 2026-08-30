import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn(
    "[email] RESEND_API_KEY is not set. Emails will not be sent. Add it to .env.local."
  );
}

export const resend = new Resend(apiKey ?? "re_placeholder");

/**
 * Sender address. In production, use a verified domain on Resend.
 * For dev, Resend allows sending from onboarding@resend.dev.
 */
export const EMAIL_FROM =
  process.env.EMAIL_FROM || "SaurabhTask <onboarding@resend.dev>";

/**
 * Base URL for building links in emails.
 * In production this should be https://saurabhtask.com or similar.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
