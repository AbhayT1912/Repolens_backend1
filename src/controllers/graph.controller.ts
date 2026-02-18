import { Request, Response } from "express";
import mongoose from "mongoose";
import { FunctionModel } from "../models/function.model";
import { RepoModel } from "../models/repo.model";

export const getCallGraph = async (req: Request, res: Response) => {
  const { repoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(repoId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid repoId",
    });
  }

  const repo = await RepoModel.findById(repoId);

  if (!repo) {
    return res.status(404).json({
      success: false,
      message: "Repository not found",
    });
  }

  if (repo.status !== "READY") {
    return res.status(400).json({
      success: false,
      message: "Repository is not ready yet",
      status: repo.status,
    });
  }

  const functions = await FunctionModel.find({
    repo_id: repoId,
  }).lean();

  return res.status(200).json({
    success: true,
    repo_id: repoId,
    total_functions: functions.length,
    nodes: functions.map((fn) => ({
      id: fn._id,
      name: fn.name,
      depth: fn.depth,
      is_entry: fn.is_entry,
      is_dead: fn.is_dead,
      component_id: fn.component_id,
      outgoing_calls: fn.outgoing_calls || [],
    })),
  });
};
