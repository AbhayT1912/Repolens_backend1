import app from "./app";
import { ENV } from "./config/env";
import { logger } from "./config/logger";
import { connectDB } from "./config/database";
import "./workers/repo.worker";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(ENV.PORT, () => {
      logger.info(`Server running on port ${ENV.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server");
    process.exit(1);
  }
};

startServer();
