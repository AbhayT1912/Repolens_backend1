import { Request, Response } from "express";
import mongoose from "mongoose";
import { ImportModel } from "../models/import.model";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import {
  analyzeFullImpact,
  rankFilesByRisk,
} from "../services/impactAnalysis.service";

export const getImpactAnalysis = asyncHandler(
  async (req: Request, res: Response) => {
    const { repoId, fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      throw new AppError("Invalid repository ID", 400);
    }

    const imports = await ImportModel.find({
      repo_id: repoId,
    }).lean();

    const edges = imports
      .filter(i => i.file_id && i.source)
      .map(i => ({
        from: i.file_id.toString(),
        to: i.source,
      }));

    const impact = analyzeFullImpact(fileId, edges);

    res.status(200).json({
      success: true,
      data: impact,
    });
  }
);

export const getRiskRanking = asyncHandler(
  async (req: Request, res: Response) => {
    const { repoId } = req.params;

    const imports = await ImportModel.find({
      repo_id: repoId,
    }).lean();

    const edges = imports
      .filter(i => i.file_id && i.source)
      .map(i => ({
        from: i.file_id.toString(),
        to: i.source,
      }));

    const ranking = rankFilesByRisk(edges);

    res.status(200).json({
      success: true,
      data: ranking,
    });
  }
);