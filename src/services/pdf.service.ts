import PDFDocument from "pdfkit";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import mongoose from "mongoose";
import { RepoReportModel } from "../models/repoReport.model";
import { RepoModel } from "../models/repo.model";
import { UsageModel } from "../models/usage.model";

const width = 800;
const height = 400;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

/* ===================================================
   MAIN ENTERPRISE PDF GENERATOR
=================================================== */

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
    `attachment; filename=${repo.name}_Enterprise_Report.pdf`
  );

  doc.pipe(res);

  /* ===============================================
     COVER PAGE – ENGINEERING MATURITY
  =============================================== */

  doc.fontSize(26)
     .fillColor("#1a237e")
     .text("RepoLens Engineering Intelligence Report", { align: "center" });

  doc.moveDown(2);

  doc.fontSize(18).fillColor("black");
  doc.text(`Repository: ${repo.name}`, { align: "center" });
  doc.text(`Generated On: ${new Date().toLocaleString()}`, { align: "center" });

  doc.moveDown(3);

  const maturity = report.engineering_maturity;

  doc.fontSize(40)
     .fillColor("#0d47a1")
     .text(maturity?.maturity_score ?? "N/A", { align: "center" });

  doc.fontSize(22)
     .fillColor("#1a237e")
     .text(`Grade: ${maturity?.maturity_grade ?? "N/A"}`, { align: "center" });

  doc.moveDown(2);

  doc.fontSize(14).fillColor("black");
  doc.text(`Architecture Health Score: ${report.architecture_health_score ?? "N/A"}`, { align: "center" });
  doc.text(`Layer Health Score: ${report.layer_analysis?.layer_health_score ?? "N/A"}`, { align: "center" });

  doc.addPage();

  /* ===============================================
     INVESTOR EXECUTIVE SUMMARY
  =============================================== */

  doc.fontSize(20)
     .fillColor("#1a237e")
     .text("Investor Executive Summary", { underline: true });

  doc.moveDown();
  doc.fontSize(12).fillColor("black");

  doc.text(report.overview || "No overview available.");

  doc.moveDown(2);

  const investor = report.investor_summary;

  if (investor) {
    doc.text(`Risk Level: ${investor.risk_level}`);
    doc.text(`Average Complexity: ${investor.avg_complexity}`);
    doc.text(`Dead Functions: ${investor.dead_functions}`);
    doc.text(`Layer Violations: ${investor.total_layer_violations}`);
    doc.text(`Repository Density: ${investor.repo_density}`);
    doc.moveDown();
    doc.text(investor.strategic_note);
  }

  doc.addPage();

  /* ===============================================
     COMPLEXITY METRICS + CHART
  =============================================== */

  doc.fontSize(18)
     .fillColor("#1a237e")
     .text("Complexity Metrics", { underline: true });

  doc.moveDown();

  const complexity = report.complexity_metrics;

  if (complexity) {
    doc.text(`Average Complexity: ${complexity.average_complexity}`);
    doc.text(`Max Complexity: ${complexity.max_complexity}`);

    const chartImage = await chartCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: ["Average", "Max"],
        datasets: [
          {
            label: "Complexity",
            data: [
              complexity.average_complexity,
              complexity.max_complexity,
            ],
            backgroundColor: ["#42a5f5", "#ef5350"],
          },
        ],
      },
    });

    doc.moveDown();
    doc.image(chartImage, { width: 450 });
  }

  doc.addPage();

  /* ===============================================
     RISK EXPOSURE HEAT SECTION
  =============================================== */

  doc.fontSize(18)
     .fillColor("#1a237e")
     .text("Risk Exposure Heat Map", { underline: true });

  doc.moveDown();

  const risk = report.risk_exposure_heat;

  if (risk) {
    doc.text(`Complexity Risk Score: ${risk.complexity_risk_score}`);
    doc.text(`Dead Code Risk Score: ${risk.dead_code_risk_score}`);
    doc.text(`Layer Violation Risk Score: ${risk.layer_violation_risk_score}`);
    doc.text(`Dependency Density Risk Score: ${risk.dependency_density_risk_score}`);

    const heatChart = await chartCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: [
          "Complexity",
          "Dead Code",
          "Layer Violations",
          "Dependency Density",
        ],
        datasets: [
          {
            label: "Risk Score",
            data: [
              risk.complexity_risk_score,
              risk.dead_code_risk_score,
              risk.layer_violation_risk_score,
              risk.dependency_density_risk_score,
            ],
            backgroundColor: [
              "#e53935",
              "#fb8c00",
              "#8e24aa",
              "#1e88e5",
            ],
          },
        ],
      },
    });

    doc.moveDown();
    doc.image(heatChart, { width: 450 });
  }

  doc.addPage();

  /* ===============================================
     RISK RANKING – TOP 5 FILES
  =============================================== */

  doc.fontSize(18)
     .fillColor("#1a237e")
     .text("Top Risky Files", { underline: true });

  doc.moveDown();

  const riskyFiles = report.dependency_density?.file_density
    ?.sort((a: any, b: any) => b.density_score - a.density_score)
    .slice(0, 5);

  if (riskyFiles) {
    riskyFiles.forEach((file: any, index: number) => {
      doc.text(
        `${index + 1}. ${file.path} — Risk Score: ${file.density_score}`
      );
    });
  }

  doc.addPage();

  /* ===============================================
     LAYER ANALYSIS VISUALIZATION
  =============================================== */

  doc.fontSize(18)
     .fillColor("#1a237e")
     .text("Layer Analysis", { underline: true });

  doc.moveDown();

  const layer = report.layer_analysis;

  if (layer) {
    doc.text(`Layer Health Score: ${layer.layer_health_score}`);
    doc.text(`Total Violations: ${layer.total_violations}`);

    const labels = Object.keys(layer.layer_matrix || {});
    const values = labels.map(l =>
      Object.values(layer.layer_matrix[l]).reduce((a: any, b: any) => a + b, 0)
    );

    const layerChart = await chartCanvas.renderToBuffer({
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              "#1e88e5",
              "#43a047",
              "#fb8c00",
              "#8e24aa",
              "#d81b60",
            ],
          },
        ],
      },
    });

    doc.moveDown();
    doc.image(layerChart, { width: 400 });
  }

  doc.addPage();

  /* ===============================================
     FOOTER
  =============================================== */

  doc.moveDown(4);
  doc.fontSize(10)
     .fillColor("gray")
     .text("Generated by RepoLens AI • Confidential • Enterprise Intelligence Report", {
       align: "center",
     });
  

  doc.end();
};