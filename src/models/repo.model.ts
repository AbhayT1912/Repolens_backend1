import mongoose, { Document, Schema } from "mongoose";
import { RepoStatus } from "../types/repo.types";

export interface RepoDocument extends Document {
  owner_id: { type: String, required: true };

  repo_url: string;
  status: RepoStatus;

  error_message?: string;

  file_count?: number;
  function_count?: number;

  started_at?: Date;
  completed_at?: Date;

  created_at: Date;
  updated_at: Date;
}

const RepoSchema = new Schema<RepoDocument>(
  {
    owner_id: { type: String, required: true },
    repo_url: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["RECEIVED", "CLONING", "SCANNING", "PARSING","GRAPHING",  "READY", "FAILED"],
      required: true,
      index: true,
    },

    error_message: { type: String },

    file_count: { type: Number },
    function_count: { type: Number },

    started_at: { type: Date },
    completed_at: { type: Date },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export const RepoModel = mongoose.model<RepoDocument>(
  "Repository",
  RepoSchema
);
