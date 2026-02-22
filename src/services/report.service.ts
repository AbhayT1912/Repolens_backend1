import { RepoModel } from "../models/repo.model";
import { FunctionModel } from "../models/function.model";
import { RepoReportModel } from "../models/repoReport.model";
import { FileModel } from "../models/file.model";
import { ImportModel } from "../models/import.model";
import { askAIService } from "./ai.service";
import mongoose from "mongoose";

/* =====================================================
   LAYER ORDER (Heuristic)
===================================================== */

const LAYER_ORDER = [
  "routes",
  "controllers",
  "services",
  "models",
  "utils",
  "components",
];

/* =====================================================
   MAIN REPORT GENERATION
===================================================== */

export const generateRepoReport = async (repoId: string) => {
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  const repo = await RepoModel.findById(repoId);
  if (!repo) throw new Error("Repo not found");

  const totalFunctions = await FunctionModel.countDocuments({
    repo_id: repoObjectId,
  });

  const deadFunctions = await FunctionModel.countDocuments({
    repo_id: repoObjectId,
    is_dead: true,
  });

  const entryPoints = await FunctionModel.find({
    repo_id: repoObjectId,
    is_entry: true,
  }).select("name");

  /* ================================
     COMPLEXITY METRICS
  ================================= */

  const complexityMetrics = await calculateComplexityMetrics(repoId);

  /* ================================
     FILE GRAPH DATA FOR LAYER + DENSITY
  ================================= */

  const files = await FileModel.find({
    repo_id: repoObjectId,
  }).lean();

  const imports = await ImportModel.find({
    repo_id: repoObjectId,
  }).lean();

  const edges: { from: string; to: string }[] = [];

  const normalizedPathMap = new Map<string, string>();

  for (const file of files) {
    const normalized = file.path
      .replace(/\\/g, "/")
      .replace(/\.ts$|\.js$/, "")
      .toLowerCase();

    normalizedPathMap.set(normalized, file._id.toString());
  }

  for (const imp of imports) {
    const fromFile = imp.file_id?.toString();
    if (!fromFile || !imp.source) continue;

    const normalizedImport = imp.source
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/^\.\.\//, "")
      .replace(/\.ts$|\.js$/, "")
      .toLowerCase();

    const matched = Array.from(normalizedPathMap.entries()).find(
      ([filePath]) => filePath.endsWith(normalizedImport)
    );

    if (!matched) continue;

    edges.push({
      from: fromFile,
      to: matched[1],
    });
  }

  /* ================================
     LAYER ANALYSIS
  ================================= */

  const layerAnalysis = analyzeLayerSeparation(files, edges);

  /* ================================
     DEPENDENCY DENSITY
  ================================= */

  const dependencyDensity = calculateDependencyDensity(files, edges);

  /* ================================
     AI ARCHITECTURE SUMMARY
  ================================= */

  const aiResponse = await askAIService(
    repoId,
    "Provide a high level architecture overview of this repository."
  );

  const report = await RepoReportModel.create({
    repo_id: repoId,
    overview: aiResponse,
    architecture_summary: aiResponse,
    entry_points: entryPoints.map((e) => e.name),
    dead_functions_count: deadFunctions,
    total_files: repo.file_count,
    total_functions: totalFunctions,

    // 🔥 NEW DATA
    complexity_metrics: complexityMetrics,
    layer_analysis: layerAnalysis,
    dependency_density: dependencyDensity,
  });

  return report;
};

/* =====================================================
   COMPLEXITY METRICS
===================================================== */

export async function calculateComplexityMetrics(repoId: string) {
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  const functions = await FunctionModel.find({
    repo_id: repoObjectId,
  }).lean();

  if (!functions.length) {
    return {
      total_functions: 0,
      average_complexity: 0,
      max_complexity: 0,
      high_complexity_functions: [],
    };
  }

  const total = functions.length;
  const complexities = functions.map((f) => f.complexity ?? 1);

  const sum = complexities.reduce((a, b) => a + b, 0);
  const max = Math.max(...complexities);
  const avg = sum / total;

  const high = functions
    .filter((f) => (f.complexity ?? 1) >= 10)
    .map((f) => ({
      function_id: f._id,
      name: f.name,
      complexity: f.complexity,
    }));

  return {
    total_functions: total,
    average_complexity: Number(avg.toFixed(2)),
    max_complexity: max,
    high_complexity_functions: high,
  };
}

/* =====================================================
   LAYER SEPARATION ENGINE
===================================================== */

function inferLayerFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();

  const match = LAYER_ORDER.find((layer) =>
    normalized.includes(`/${layer}/`)
  );

  return match ?? "unknown";
}

export function analyzeLayerSeparation(
  files: any[],
  edges: { from: string; to: string }[]
) {
  const fileLayerMap = new Map<string, string>();

  for (const file of files) {
    const layer = inferLayerFromPath(file.path);
    fileLayerMap.set(file._id.toString(), layer);
  }

  const layerMatrix: Record<string, Record<string, number>> = {};
  const violations: any[] = [];

  for (const { from, to } of edges) {
    const fromLayer = fileLayerMap.get(from);
    const toLayer = fileLayerMap.get(to);

    if (!fromLayer || !toLayer) continue;

    if (!layerMatrix[fromLayer]) {
      layerMatrix[fromLayer] = {};
    }

    if (!layerMatrix[fromLayer][toLayer]) {
      layerMatrix[fromLayer][toLayer] = 0;
    }

    layerMatrix[fromLayer][toLayer]++;

    const fromIndex = LAYER_ORDER.indexOf(fromLayer);
    const toIndex = LAYER_ORDER.indexOf(toLayer);

    if (
      fromIndex !== -1 &&
      toIndex !== -1 &&
      fromIndex > toIndex
    ) {
      violations.push({
        from_layer: fromLayer,
        to_layer: toLayer,
        severity: "upward_dependency",
      });
    }
  }

  const totalViolations = violations.length;

  const layerHealthScore = Math.max(
    0,
    100 - totalViolations * 5
  );

  return {
    layer_matrix: layerMatrix,
    violations,
    total_violations: totalViolations,
    layer_health_score: layerHealthScore,
  };
}

/* =====================================================
   DEPENDENCY DENSITY ENGINE
===================================================== */

function calculateDependencyDensity(
  files: any[],
  edges: { from: string; to: string }[]
) {
  const incoming: Record<string, number> = {};
  const outgoing: Record<string, number> = {};

  for (const file of files) {
    const id = file._id.toString();
    incoming[id] = 0;
    outgoing[id] = 0;
  }

  for (const edge of edges) {
    outgoing[edge.from]++;
    incoming[edge.to]++;
  }

  const fileDensity = files.map((file) => {
    const id = file._id.toString();

    return {
      file_id: id,
      path: file.path,
      outgoing_dependencies: outgoing[id],
      incoming_dependencies: incoming[id],
      density_score: outgoing[id] + incoming[id],
    };
  });

  const repoDensity =
    files.length > 0 ? edges.length / files.length : 0;

  return {
    repo_density: Number(repoDensity.toFixed(2)),
    file_density: fileDensity,
  };
}