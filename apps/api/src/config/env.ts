import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgresql://nexus:nexus@localhost:5432/nexus"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT — refuse insecure defaults in production
  JWT_SECRET: z.string().min(32).default("dev-jwt-secret-change-in-production-min-32-chars"),
  JWT_REFRESH_SECRET: z.string().min(32).default("dev-refresh-secret-change-in-production-min-32"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_RPM_DEFAULT: z.coerce.number().default(300),

  // LLM providers
  LLM_PROVIDER: z.enum(["openai", "anthropic", "none"]).default("none"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CHAT_MODEL: z.string().default("claude-sonnet-4-6"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // Encryption (AES-GCM) for credentials stored at rest
  ENCRYPTION_KEY: z.string().optional(), // 64 hex chars = 32 bytes

  // Object storage
  S3_ENDPOINT: z.string().optional(), // MinIO or AWS
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Webhook signing
  WEBHOOK_SIGNING_SECRET: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  OTEL_ENDPOINT: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("noreply@nexus.local"),

  // SaaS / Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const env = envSchema.parse(process.env);

  // Refuse insecure JWT defaults in production
  if (env.NODE_ENV === "production") {
    const insecure = [
      "dev-jwt-secret-change-in-production-min-32-chars",
      "dev-refresh-secret-change-in-production-min-32",
    ];
    if (insecure.includes(env.JWT_SECRET) || insecure.includes(env.JWT_REFRESH_SECRET)) {
      throw new Error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set to secure values in production");
    }
    if (!env.ENCRYPTION_KEY) {
      console.warn("WARNING: ENCRYPTION_KEY not set — credentials will not be encrypted at rest");
    }
  }

  return env;
}
