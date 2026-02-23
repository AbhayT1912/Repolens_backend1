import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { RepoReportModel } from "../models/repoReport.model";
import { generateExecutivePDF } from "../services/pdf.service";
import { UsageModel } from "../models/usage.model";
import mongoose from "mongoose";
import { detectRegression, calculateVelocity, calculateVolatilityScore, predictDegradation , calculateStabilityIndex} from "../services/trend.service";

/* =====================================================
   TYPE FOR HISTORY SNAPSHOT (Fixes Red Underlines)
===================================================== */

interface ReportHistorySnapshot {
  version: number;
  architecture_health_score: number;
  layer_analysis?: {
    layer_health_score?: number;
  };
  complexity_metrics?: {
    average_complexity?: number;
  };
  dead_functions_count: number;
  maturity?: {
    maturity_score?: number;
  };
  created_at: Date;
}

/* =====================================================
   DOWNLOAD EXECUTIVE PDF
===================================================== */

export const downloadExecutivePDF = async (req: any, res: any, next: any) => {
  try {
    await UsageModel.updateOne(
      { user_id: req.auth.userId },
      { $inc: { download_count: 1 } },
      { upsert: true }
    );

    await generateExecutivePDF(req.params.repoId, res);
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   GET SINGLE REPORT
===================================================== */

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

/* =====================================================
   GET REPO HISTORY (Phase 5)
===================================================== */

export const getRepoHistory = async (req: Request, res: Response) => {
  const { repoId } = req.params;

  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  const reports = await RepoReportModel.find({
    repo_id: repoObjectId,
  })
    .sort({ version: 1 })
    .select(
      "version architecture_health_score layer_analysis complexity_metrics dead_functions_count maturity created_at"
    )
    .lean<ReportHistorySnapshot[]>(); // ✅ Proper typing

  const trend = reports.map((r) => ({
    version: r.version,
    architecture_score: r.architecture_health_score,
    layer_score: r.layer_analysis?.layer_health_score ?? 0,
    avg_complexity: r.complexity_metrics?.average_complexity ?? 0,
    dead_functions: r.dead_functions_count,
    maturity_score: r.maturity?.maturity_score ?? 0,
    created_at: r.created_at,
  }));

  // 🔥 Phase 5 Intelligence
  const regressionAlert = detectRegression(reports);
  const engineeringVelocity = calculateVelocity(reports);
  const stabilityIndex = calculateStabilityIndex(reports);
  const volatilityScore = calculateVolatilityScore(reports);
  const degradationPrediction = predictDegradation(reports);


  res.json({
    success: true,
    data: {
      trend,
      regression_alert: regressionAlert,
      engineering_velocity: engineeringVelocity,
      stability_index: stabilityIndex,
      volatility_score: volatilityScore,
      degradation_prediction: degradationPrediction,
    },
  });
};