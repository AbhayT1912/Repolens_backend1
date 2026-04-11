import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { globalErrorHandler } from "./middleware/error.middleware";
import { ENV } from "./config/env";
import { logger } from "./config/logger";
import repoRoutes from "./routes/v1/repo.routes";
import securityRoutes from "./routes/v1/security.routes";
import authRoutes from "./routes/v1/auth.routes";
import { handleGitHubWebhook } from "./controllers/pr.controller";



const app = express();

/* ========================
   TRUST PROXY (for X-Forwarded-For headers from load balancers)
   IMPORTANT: Must be set BEFORE any middleware checks X-Forwarded-For
======================== */
app.set('trust proxy', 1);

/* ========================
   SECURITY MIDDLEWARE
======================== */

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: "*", // restrict later
}));

/* ========================
   REGISTER WEBHOOK WITH RAW BODY PARSING
   (Must be BEFORE express.json() and rate limiter)
======================== */

// Use express.raw for webhook to capture raw body
app.post("/api/v1/webhook/github", express.raw({ type: 'application/json' }), (req: any, res, next) => {
  // Store the raw body as string for signature verification
  req.rawBody = req.body.toString();
  // Parse JSON separately
  try {
    req.body = JSON.parse(req.rawBody);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
}, handleGitHubWebhook);

app.use(express.json({ limit: "1mb" }));

/* ========================
   RATE LIMITER
======================== */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});

app.use(limiter);

app.use("/api/v1/auth", authRoutes);

/* ========================
   REQUEST LOGGING
======================== */

app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

/* ========================
   HEALTH CHECK
======================== */

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "OK",
    environment: ENV.NODE_ENV
  });
});

app.get("/error-test", () => {
  throw new Error("Unexpected crash");
});

app.use("/api/v1", repoRoutes);

app.use("/api/v1/repos", securityRoutes);


app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      status: 404,
    },
  });
});
/* ========================
   ERROR HANDLING
======================== */

app.use(globalErrorHandler);

export default app;
