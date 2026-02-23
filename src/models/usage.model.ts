import mongoose, { Schema, Document } from "mongoose";

export interface UsageDocument extends Document {
  user_id: string;
  analyses_count: number;
  ai_tokens_used: number;
  pdf_downloads: number;
  created_at: Date;
}

const UsageSchema = new Schema<UsageDocument>(
  {
    user_id: { type: String, required: true, unique: true },
    analyses_count: { type: Number, default: 0 },
    ai_tokens_used: { type: Number, default: 0 },
    pdf_downloads: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const UsageModel = mongoose.model<UsageDocument>(
  "Usage",
  UsageSchema
);