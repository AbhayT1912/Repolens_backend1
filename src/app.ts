import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { globalErrorHandler } from "./middleware/error.middleware";
import { ENV } from "./config/env";
import { logger } from "./config/logger";
import repoRoutes from "./routes/v1/repo.routes";
import authRoutes from "./routes/v1/auth.routes";



const app = express();

/* ========================
   SECURITY MIDDLEWARE
======================== */

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: "*", // restrict later
}));

app.use("/api/v1/auth", authRoutes);

app.use(express.json({ limit: "1mb" }));

/* ========================
   RATE LIMITER
======================== */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

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
