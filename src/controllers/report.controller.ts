import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { RepoReportModel } from "../models/repoReport.model";
import { generateExecutivePDF } from "../services/pdf.service";

export const downloadExecutivePDF = async (req, res, next) => {
  try {
    await generateExecutivePDF(req.params.repoId, res);
  } catch (error) {
    next(error);
  }
}

export const getRepoReport = asyncHandler(async (req: Request, res: Response) => {
  const { repoId } = req.params;

  const report = await RepoReportModel.findOne({ repo_id: repoId });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Report not generated yet",
    });
  }

  res.status(200).json({
    success: true,
    data: report,
  });
});