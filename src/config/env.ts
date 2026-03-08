import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.string(),
  MAX_REPO_SIZE_MB: z.string(),
  CLONE_TIMEOUT: z.string(),
  TEMP_DIR_PATH: z.string(),
  MONGO_URI: z.string(),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  REDIS_REQUIRED_MAXMEMORY_POLICY: z.string().default("noeviction"),
  REDIS_ENFORCE_POLICY: z.enum(["true", "false"]).optional(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  process.exit(1);
}

export const ENV = {
  PORT: Number(parsed.data.PORT),
  NODE_ENV: parsed.data.NODE_ENV,
  MAX_REPO_SIZE_MB: Number(parsed.data.MAX_REPO_SIZE_MB),
  CLONE_TIMEOUT: Number(parsed.data.CLONE_TIMEOUT),
  TEMP_DIR_PATH: parsed.data.TEMP_DIR_PATH,
  MONGO_URI: parsed.data.MONGO_URI,
  REDIS_URL: parsed.data.REDIS_URL,
  REDIS_REQUIRED_MAXMEMORY_POLICY:
    parsed.data.REDIS_REQUIRED_MAXMEMORY_POLICY.trim().toLowerCase(),
  REDIS_ENFORCE_POLICY:
    parsed.data.REDIS_ENFORCE_POLICY !== undefined
      ? parsed.data.REDIS_ENFORCE_POLICY === "true"
      : parsed.data.NODE_ENV === "production",
  CLERK_SECRET_KEY: parsed.data.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: parsed.data.CLERK_WEBHOOK_SECRET,
};
