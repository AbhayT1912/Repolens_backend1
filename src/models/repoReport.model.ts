import mongoose, { Schema, Document } from "mongoose";

export interface IRepoReport extends Document {
  repo_id: mongoose.Types.ObjectId;
  overview: string;
  architecture_summary: string;
  entry_points: string[];
  dead_functions_count: number;
  total_files: number;
  total_functions: number;
  generated_at: Date;
}

const RepoReportSchema = new Schema<IRepoReport>({
  repo_id: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  overview: String,
  architecture_summary: String,
  entry_points: [String],
  dead_functions_count: Number,
  total_files: Number,
  total_functions: Number,
  generated_at: { type: Date, default: Date.now },
});

export const RepoReportModel = mongoose.model<IRepoReport>(
  "RepoReport",
  RepoReportSchema
);