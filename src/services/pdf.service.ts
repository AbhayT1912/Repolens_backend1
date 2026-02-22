import PDFDocument from "pdfkit";
import { RepoReportModel } from "../models/repoReport.model";
import { RepoModel } from "../models/repo.model";
import mongoose from "mongoose";

export const generateExecutivePDF = async (repoId: string, res: any) => {
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  const repo = await RepoModel.findById(repoId);
  const report = await RepoReportModel.findOne({
    repo_id: repoObjectId,
  });

  if (!repo || !report) {
    throw new Error("Report not found");
  }

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${repo.name}_Executive_Report.pdf`
  );

  doc.pipe(res);

  /* =====================================
     COVER PAGE
  ===================================== */

  doc.fontSize(24).text("Executive Architecture Report", {
    align: "center",
  });

  doc.moveDown();
  doc.fontSize(16).text(`Repository: ${repo.name}`);
  doc.text(`Generated On: ${new Date().toLocaleString()}`);
  doc.text(
    `Architecture Health Score: ${report?.architecture_health_score ?? "N/A"}`
  );
  doc.text(
    `Layer Health Score: ${report?.layer_analysis?.layer_health_score ?? "N/A"}`
  );

  doc.addPage();

  /* =====================================
     EXECUTIVE SUMMARY
  ===================================== */

  doc.fontSize(18).text("Executive Summary", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(report.overview || "No overview available.");

  doc.moveDown();
  doc.text(`Total Files: ${report.total_files}`);
  doc.text(`Total Functions: ${report.total_functions}`);
  doc.text(`Dead Functions: ${report.dead_functions_count}`);
  doc.text(
    `Entry Points: ${report.entry_points?.join(", ") || "None"}`
  );

  doc.addPage();

  /* =====================================
     COMPLEXITY METRICS
  ===================================== */

  doc.fontSize(18).text("Complexity Metrics", { underline: true });
  doc.moveDown();

  const complexity = report.complexity_metrics;

  if (complexity) {
    doc.text(`Average Complexity: ${complexity.average_complexity}`);
    doc.text(`Max Complexity: ${complexity.max_complexity}`);

    doc.moveDown();
    doc.text("High Complexity Functions:");

    complexity.high_complexity_functions
      ?.slice(0, 10)
      .forEach((fn: any) => {
        doc.text(
          `- ${fn.name} (Complexity: ${fn.complexity})`
        );
      });
  }

  doc.addPage();

  /* =====================================
     LAYER ANALYSIS
  ===================================== */

  doc.fontSize(18).text("Layer Analysis", { underline: true });
  doc.moveDown();

  const layer = report.layer_analysis;

  if (layer) {
    doc.text(`Layer Health Score: ${layer.layer_health_score}`);
    doc.text(`Total Violations: ${layer.total_violations}`);

    doc.moveDown();
    doc.text("Layer Matrix:");

    Object.entries(layer.layer_matrix || {}).forEach(
      ([from, targets]: any) => {
        Object.entries(targets).forEach(
          ([to, count]: any) => {
            doc.text(`${from} → ${to}: ${count}`);
          }
        );
      }
    );
  }

  doc.addPage();

  /* =====================================
     DEPENDENCY DENSITY
  ===================================== */

  doc.fontSize(18).text("Dependency Density", { underline: true });
  doc.moveDown();

  const density = report.dependency_density;

  if (density) {
    doc.text(`Repository Density: ${density.repo_density}`);

    doc.moveDown();
    doc.text("Top Coupled Files:");

    density.file_density
      ?.sort((a: any, b: any) => b.density_score - a.density_score)
      .slice(0, 5)
      .forEach((file: any) => {
        doc.text(
          `- ${file.path} (Score: ${file.density_score})`
        );
      });
  }

  doc.end();
};