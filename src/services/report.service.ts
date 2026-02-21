import { RepoModel } from "../models/repo.model";
import { FunctionModel } from "../models/function.model";
import { RepoReportModel } from "../models/repoReport.model";
import { askAIService } from "./ai.service";

export const generateRepoReport = async (repoId: string) => {
  const repo = await RepoModel.findById(repoId);
  if (!repo) throw new Error("Repo not found");

  const totalFunctions = await FunctionModel.countDocuments({ repo_id: repoId });
  const deadFunctions = await FunctionModel.countDocuments({
    repo_id: repoId,
    is_dead: true,
  });

  const entryPoints = await FunctionModel.find({
    repo_id: repoId,
    is_entry: true,
  }).select("name");

  // Ask AI for architecture summary
  const aiResponse = await askAIService(
  repoId,
  "Provide a high level architecture overview of this repository."
);

  const report = await RepoReportModel.create({
    repo_id: repoId,
    overview: aiResponse,
    architecture_summary: aiResponse,
    entry_points: entryPoints.map(e => e.name),
    dead_functions_count: deadFunctions,
    total_files: repo.file_count,
    total_functions: totalFunctions,
  });

  return report;
};