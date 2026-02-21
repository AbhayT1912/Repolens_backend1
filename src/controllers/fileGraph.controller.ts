import { Request, Response } from "express";
import mongoose from "mongoose";
import { FileModel } from "../models/file.model";
import { ImportModel } from "../models/import.model";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const getFileGraph = asyncHandler(
  async (req: Request, res: Response) => {
    const { repoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      throw new AppError("Invalid repository ID", 400);
    }

    const repoObjectId = new mongoose.Types.ObjectId(repoId);

    // 🔹 Fetch files
    const files = await FileModel.find({
      repo_id: repoObjectId,
    }).lean();

    if (!files.length) {
      return res.status(200).json({
        success: true,
        data: {
          repo_id: repoId,
          nodes: [],
          edges: [],
        },
      });
    }

    // 🔹 Build file map
    const filePathMap = new Map<string, any>();

    for (const file of files) {
      filePathMap.set(file._id.toString(), {
        id: file._id.toString(),
        label: file.path,
        language: file.language,
        size: file.size,
      });
    }

    // 🔹 Fetch imports
    const imports = await ImportModel.find({
      repo_id: repoObjectId,
    }).lean();

    const edgeSet = new Set<string>();
    const edges: { from: string; to: string }[] = [];

    for (const imp of imports) {
      const fromFile = imp.file_id?.toString();
      const targetPath = imp.source; // assuming stored as string

      if (!fromFile || !targetPath) continue;

      // Find target file by path match
      const targetFile = files.find((f) =>
        f.path.includes(targetPath)
      );

      if (!targetFile) continue;

      const toFile = targetFile._id.toString();

      const edgeKey = `${fromFile}->${toFile}`;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          from: fromFile,
          to: toFile,
        });
      }
    }

    // Sort edges deterministically
    edges.sort((a, b) => {
      if (a.from === b.from) {
        return a.to.localeCompare(b.to);
      }
      return a.from.localeCompare(b.from);
    });

    const nodes = Array.from(filePathMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    return res.status(200).json({
      success: true,
      data: {
        repo_id: repoId,
        node_count: nodes.length,
        edge_count: edges.length,
        nodes,
        edges,
      },
    });
  }
);