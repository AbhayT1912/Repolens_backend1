import mongoose, { Document, Schema } from "mongoose";

export interface CallDocument extends Document {
  repo_id: mongoose.Types.ObjectId;
  file_id: mongoose.Types.ObjectId;

  caller_function_name?: string; // if inside function
  callee_name: string;

  start_line: number;
}

const CallSchema = new Schema<CallDocument>(
  {
    repo_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    file_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    caller_function_name: {
      type: String,
    },
    callee_name: {
      type: String,
      required: true,
    },
    start_line: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const CallModel = mongoose.model<CallDocument>(
  "Call",
  CallSchema
);
