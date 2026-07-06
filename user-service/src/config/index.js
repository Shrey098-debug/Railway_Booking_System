const config = {
  SERVICE_NAME: require('../../package.json').name,
  PORT: Number(process.env.PORT) || 4001,
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  OTP_TTL: process.env.OTP_TTL || 300,
  OTP_RATE_MAX_PER_HOUR: process.env.OTP_RATE_MAX_PER_HOUR || 5,
  OTP_MAX_VERIFY_ATTEMPTS: process.env.OTP_MAX_VERIFY_ATTEMPTS || 5,
  OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET || "09dc0abbb2961391d822610b31b912e3231d4d2745c76b1ef4765af4c62f6079",

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "0f8bf908f8d38527c188c93bda49d48bd421a43fa0bdf3e77de1f0db785e6f37",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "826d2c0edb5ad8f8ac7668556c034ea228931a49576aefccc80d6f469cc4a34c4da82ca43a5c43de91ffdad2f4644c655e2eb3ccbb8bc2848cb64fe7ea2a1ab9",
  ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP || "15m",
  REFRESH_TOKEN_EXP: process.env.REFRESH_TOKEN_EXP || "7d",
  ACCESS_TOKEN_EXP_SEC: Number(process.env.ACCESS_TOKEN_EXP_SEC || 900),
  REFRESH_TOKEN_EXP_SEC: Number(process.env.REFRESH_TOKEN_EXP_SEC || 604800),
  REDIS_USER_TTL: Number(process.env.REDIS_USER_TTL || 86400),


  // ── Email (OTP delivery) ──────────────────────────────────────────────
  // Preferred in production: Resend HTTP API (port 443, never blocked by hosts).
  // Most cloud platforms block outbound SMTP ports (465/587), which is why
  // Gmail/nodemailer silently fails once deployed. Gmail SMTP is kept as a
  // local-dev fallback only.
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,

  // Gmail SMTP — optional, dev fallback
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY,
}


// Google OAuth is optional — email/password + OTP login work without it.
// (Only the "Sign in with Google" button needs this.) Warn instead of crashing
// so the service still boots for local dev without Google credentials.
if (!config.GOOGLE_CLIENT_ID) {
  console.warn("[user-service] GOOGLE_CLIENT_ID not set — 'Sign in with Google' will be disabled.");
}

// In production we need at least one working email provider to deliver OTPs.
// Resend (HTTP) is preferred; Gmail SMTP is accepted but often blocked on hosts.
const hasResend = !!config.RESEND_API_KEY;
const hasGmail = !!config.GMAIL_USER && !!config.GMAIL_APP_PASSWORD;

if (config.NODE_ENV === 'production' && !hasResend && !hasGmail) {
  throw new Error(
    'No email provider configured. Set RESEND_API_KEY (recommended) or GMAIL_USER + GMAIL_APP_PASSWORD.'
  );
}

module.exports = { config };