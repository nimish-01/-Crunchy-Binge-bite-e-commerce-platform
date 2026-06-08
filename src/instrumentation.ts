export async function register() {
  // Only run on the Node.js runtime (not Edge). Validates required env vars at startup
  // so missing config causes an immediate, clear error rather than a confusing runtime failure.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const required: Record<string, string> = {
      DATABASE_URL: "PostgreSQL connection string (Neon or other provider)",
      NEXTAUTH_SECRET: "Secret for signing JWTs — generate with: openssl rand -base64 32",
      RAZORPAY_KEY_ID: "Razorpay API key ID from the Razorpay dashboard",
      RAZORPAY_KEY_SECRET: "Razorpay API key secret from the Razorpay dashboard",
      RAZORPAY_WEBHOOK_SECRET: "Razorpay webhook secret — set in the Razorpay dashboard under Webhooks",
    }

    const missing = Object.entries(required).filter(([key]) => !process.env[key])

    if (missing.length > 0) {
      const lines = missing.map(([key, desc]) => `  ${key} — ${desc}`)
      throw new Error(
        `Missing required environment variables:\n${lines.join("\n")}\n\n` +
        `Add them to your .env.local file and restart the server.`
      )
    }
  }
}
