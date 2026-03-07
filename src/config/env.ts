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
  CLERK_SECRET_KEY: parsed.data.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: parsed.data.CLERK_WEBHOOK_SECRET,
};
