const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { config } = require('../config');

// ─── Provider selection ───────────────────────────────────────────────────────
// Priority: Resend (HTTP API) → Gmail SMTP → dev console.
//
// WHY: most cloud hosts (Render, Railway, Fly, Vercel, …) block outbound SMTP
// ports 465/587 to fight spam, so nodemailer + Gmail works locally but silently
// fails in production. Resend delivers over HTTPS (443), which is never blocked.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const useResend = !!config.RESEND_API_KEY;

// Gmail SMTP transport (dev fallback only). Requires an App Password.
const gmailConfigured =
     !!config.GMAIL_USER &&
     !!config.GMAIL_APP_PASSWORD &&
     !config.GMAIL_USER.includes('your_gmail') &&
     !config.GMAIL_APP_PASSWORD.includes('your_');

const transporter = gmailConfigured
     ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user: config.GMAIL_USER, pass: config.GMAIL_APP_PASSWORD },
       })
     : null;

// Sender address. Resend needs a verified domain in production; for quick testing
// its shared sender "onboarding@resend.dev" works (delivers to your own account email).
const FROM = config.MAIL_FROM || config.GMAIL_USER || 'IRCTC <onboarding@resend.dev>';

const MAX_RETRIES = 3;

function otpTemplate(otp, ttlMinutes) {
     return `
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 10px; background: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4A3AFF; margin: 0;">IRCTC</h2>
      </div>
      <p style="font-size: 16px; color: #333;">Hi,</p>
      <p style="font-size: 16px; color: #333;">Use the verification code below to complete your sign up:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; padding: 14px 26px; font-size: 32px; letter-spacing: 8px; font-weight: bold; background: #F4F4FF; border-radius: 8px; color: #4A3AFF; border: 1px solid #e0e0ff;">
          ${otp}
        </div>
      </div>
      <p style="font-size: 15px; color: #555;">This code will expire in <strong>${ttlMinutes} minutes</strong>.</p>
      <p style="font-size: 15px; color: #555;">If this wasn't you, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="font-size: 14px; color: #888; text-align: center;">Happy Journey 🚂<br/><strong>Team IRCTC</strong></p>
    </div>
  `;
}

// ─── Transport implementations ────────────────────────────────────────────────

// Resend HTTP API (uses global fetch — Node 18+, no extra dependency).
async function sendViaResend(msg) {
     const res = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
               Authorization: `Bearer ${config.RESEND_API_KEY}`,
               'Content-Type': 'application/json',
          },
          body: JSON.stringify({
               from: msg.from,
               to: [msg.to],
               subject: msg.subject,
               html: msg.html,
          }),
     });

     if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Resend API ${res.status}: ${body || res.statusText}`);
     }
}

async function sendViaGmail(msg) {
     await transporter.sendMail(msg);
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function sendOtpEmail(email, otp, ttlMinutes) {
     const msg = {
          from: FROM,
          to: email,
          subject: 'Your IRCTC verification code',
          html: otpTemplate(otp, ttlMinutes),
     };

     // No provider configured. In production this is a hard error; in dev we print
     // the OTP so signup still works without any email setup.
     if (!useResend && !transporter) {
          if (config.NODE_ENV === 'production') {
               throw new Error('No email provider configured (set RESEND_API_KEY or Gmail credentials)');
          }
          logger.warn(`\n========================================\n[DEV OTP] No email provider configured.\n  Email : ${email}\n  OTP   : ${otp}  (expires in ${ttlMinutes} min)\n========================================`);
          return { success: true, devMode: true };
     }

     const send = useResend ? sendViaResend : sendViaGmail;
     const provider = useResend ? 'resend' : 'gmail';

     let lastError;
     for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
               await send(msg);
               logger.info(`OTP email sent to ${email} via ${provider} (attempt ${attempt})`);
               return { success: true, provider };
          } catch (error) {
               lastError = error;
               logger.error(`OTP email failed via ${provider} (attempt ${attempt}/${MAX_RETRIES})`, {
                    to: email,
                    error: error.message,
               });
               if (attempt < MAX_RETRIES) {
                    await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
               }
          }
     }
     throw lastError;
}

module.exports = { sendOtpEmail };