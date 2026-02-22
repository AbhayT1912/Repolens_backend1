import mongoose, { Document, Schema } from "mongoose";

export interface RepoReportDocument extends Document {
  repo_id: mongoose.Types.ObjectId;

  overview: string;
  architecture_summary: string;

  entry_points: string[];
  dead_functions_count: number;
  total_files: number;
  total_functions: number;

  complexity_metrics: any;
  layer_analysis: any;
  dependency_density: any;

  generated_at: Date;
}

const RepoReportSchema = new Schema<RepoReportDocument>(
  {
    repo_id: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },

    overview: { type: String },
    architecture_summary: { type: String },

    entry_points: [{ type: String }],
    dead_functions_count: { type: Number },
    total_files: { type: Number },
    total_functions: { type: Number },

    // 🔥 NEW FIELDS
    complexity_metrics: { type: Schema.Types.Mixed },
    layer_analysis: { type: Schema.Types.Mixed },
    dependency_density: { type: Schema.Types.Mixed },

    generated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

export const RepoReportModel = mongoose.model<RepoReportDocument>(
  "RepoReport",
  RepoReportSchema
);