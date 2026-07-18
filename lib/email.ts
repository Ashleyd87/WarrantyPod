// Minimal transactional email sender. Uses Resend's HTTP API via fetch when
// RESEND_API_KEY is set; otherwise logs the message server-side so flows don't
// hard-fail when email isn't configured yet (dev / not-yet-set-up).
// Deliberately no SDK — a plain fetch keeps the server bundle clean.

const FROM = process.env.EMAIL_FROM || "Warranty Vault <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[email:unconfigured] would send to ${to} — "${subject}"\n${html}`
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Email send failed (${res.status})`);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  url: string
): Promise<void> {
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B0B0B">
    <div style="font-size:20px;font-weight:800;margin-bottom:8px">Warranty Vault</div>
    <p style="font-size:15px;line-height:1.5;color:#333">
      We received a request to reset your password. Tap the button below to choose
      a new one. This link expires in 1 hour.
    </p>
    <p style="margin:24px 0">
      <a href="${url}"
         style="display:inline-block;background:#7361F2;color:#fff;text-decoration:none;
                font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px">
        Reset password
      </a>
    </p>
    <p style="font-size:13px;color:#8A857D;line-height:1.5">
      If you didn't request this, you can safely ignore this email — your password
      won't change.
    </p>
  </div>`;
  await sendEmail(to, "Reset your Warranty Vault password", html);
}
