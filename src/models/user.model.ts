// src/models/user.model.ts

import mongoose, { Schema, Document } from "mongoose";

export interface UserDocument extends Document {
  clerk_user_id: string;
  email: string;
  credits: number; // Optional field for user credits
  created_at: Date;
  last_credit_reset: Date; // Optional field to track when credits were last reset
}

const UserSchema = new Schema<UserDocument>(
  {
    clerk_user_id: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    credits: { type: Number, default: 100 },
    last_credit_reset: { type: Date, default: Date.now },
  },
  
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

export const UserModel = mongoose.model<UserDocument>(
  "User",
  UserSchema
);