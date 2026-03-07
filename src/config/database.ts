import mongoose from "mongoose";
import { ENV } from "./env";
import { logger } from "./logger";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info("MongoDB connected");
  } catch (error: any) {
    logger.error("MongoDB connection failed", { error: error.message });
    process.exit(1);
  }
};
