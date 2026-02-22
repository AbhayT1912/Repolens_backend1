import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import mongoose from "mongoose";

import { FileModel } from "../models/file.model";
import { FunctionModel } from "../models/function.model";
import { ImportModel } from "../models/import.model";
import { CallModel } from "../models/call.model";
import { RepoModel } from "../models/repo.model";
import { logger } from "../config/logger";
import { getRepoPath } from "../utils/repoPath.util";

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

export const parseRepository = async (repoId: string) => {
  const files = await FileModel.find({ repo_id: repoId });
  const basePath = getRepoPath(repoId);
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  let totalFunctionCount = 0;

  for (const file of files) {
    const ext = path.extname(file.path);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

    const absolutePath = path.join(basePath, file.path);
    if (!fs.existsSync(absolutePath)) continue;

    try {
      const code = fs.readFileSync(absolutePath, "utf-8");
      const isTypeScript = ext === ".ts" || ext === ".tsx";

      const ast = parse(code, {
        sourceType: "unambiguous",
        errorRecovery: true,
        plugins: [
          ...(isTypeScript ? ["typescript"] : ["flow"]),
          "jsx",
          "classProperties",
          "classPrivateProperties",
          "classPrivateMethods",
          "decorators-legacy",
          "dynamicImport",
          "objectRestSpread",
          "optionalChaining",
          "nullishCoalescingOperator",
        ],
      });

      const functionsToInsert: any[] = [];
      const importsToInsert: any[] = [];
      const callsToInsert: any[] = [];

      let currentFunction: string | null = null;
      let complexity = 1;

      // ============================
      // FIRST PASS — COLLECT FUNCTIONS & IMPORTS
      // ============================

      traverse(ast, {
        // Complexity
        IfStatement() {
          complexity++;
        },
        ForStatement() {
          complexity++;
        },
        WhileStatement() {
          complexity++;
        },
        DoWhileStatement() {
          complexity++;
        },
        SwitchCase() {
          complexity++;
        },
        ConditionalExpression() {
          complexity++;
        },
        LogicalExpression(path) {
          if (path.node.operator === "&&" || path.node.operator === "||") {
            complexity++;
          }
        },

        // Imports
        ImportDeclaration(path) {
          const node = path.node;

          const specifiers = node.specifiers.map((s) => {
            if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
              return s.imported.name;
            }
            if (t.isImportDefaultSpecifier(s) && t.isIdentifier(s.local)) {
              return s.local.name;
            }
            return "unknown";
          });

          importsToInsert.push({
            repo_id: repoObjectId,
            file_id: file._id,
            source: node.source.value,
            specifiers,
            is_external: !node.source.value.startsWith("."),
          });
        },

        // Function Declarations
        FunctionDeclaration: {
          enter(path) {
            if (!path.node.id) return;
            currentFunction = path.node.id.name;

            functionsToInsert.push({
              repo_id: repoObjectId,
              file_id: file._id,
              name: currentFunction,
              type: "FunctionDeclaration",
              start_line: path.node.loc?.start.line ?? 0,
              end_line: path.node.loc?.end.line ?? 0,
            });
          },
          exit() {
            currentFunction = null;
          },
        },

        // Arrow / Function Expressions
        VariableDeclarator(path) {
          const node = path.node;

          if (
            t.isIdentifier(node.id) &&
            (t.isArrowFunctionExpression(node.init) ||
              t.isFunctionExpression(node.init))
          ) {
            functionsToInsert.push({
              repo_id: repoObjectId,
              file_id: file._id,
              name: node.id.name,
              type: "FunctionExpression",
              start_line: node.loc?.start.line ?? 0,
              end_line: node.loc?.end.line ?? 0,
            });
          }
        },
      });

      // ============================
      // INSERT FUNCTIONS FIRST
      // ============================

      let insertedFunctions: any[] = [];

      if (functionsToInsert.length > 0) {
        insertedFunctions = await FunctionModel.insertMany(functionsToInsert);
        totalFunctionCount += insertedFunctions.length;
      }

      // Build function name → id map
      const functionMap = new Map<string, mongoose.Types.ObjectId>();
      for (const fn of insertedFunctions) {
        functionMap.set(fn.name, fn._id);
      }

      // ============================
      // SECOND PASS — RESOLVE CALLS
      // ============================

      // SECOND PASS — RESOLVE CALLS
      traverse(ast, {
        FunctionDeclaration: {
          enter(path) {
            if (!path.node.id) return;
            currentFunction = path.node.id.name;
          },
          exit(path) {
            if (path.node.id?.name === currentFunction) {
              currentFunction = null;
            }
          },
        },

        VariableDeclarator: {
          enter(path) {
            const node = path.node;

            if (
              t.isIdentifier(node.id) &&
              (t.isArrowFunctionExpression(node.init) ||
                t.isFunctionExpression(node.init))
            ) {
              currentFunction = node.id.name;
            }
          },
          exit(path) {
            const node = path.node;
            if (t.isIdentifier(node.id) && node.id.name === currentFunction) {
              currentFunction = null;
            }
          },
        },

        CallExpression(path) {
          const node = path.node;

          if (!currentFunction) return;

          let calleeName: string | null = null;

          if (t.isIdentifier(node.callee)) {
            calleeName = node.callee.name;
          }

          if (!calleeName) return;

          if (!functionMap.has(calleeName)) return;

          const callerId = functionMap.get(currentFunction);
          const calleeId = functionMap.get(calleeName);

          if (!callerId || !calleeId) return;

          callsToInsert.push({
            repo_id: repoObjectId,
            file_id: file._id,
            caller_function_id: callerId,
            callee_function_id: calleeId,
            start_line: node.loc?.start.line ?? 0,
          });
        },
      });
      // ============================
      // INSERT IMPORTS & CALLS
      // ============================

      if (importsToInsert.length > 0) {
        await ImportModel.insertMany(importsToInsert);
      }

      if (callsToInsert.length > 0) {
        await CallModel.insertMany(callsToInsert);
      }
    } catch (error: any) {
      logger.error("Parsing failed for file", {
        file: file.path,
        error: error.message,
      });
    }
  }

  await RepoModel.findByIdAndUpdate(repoId, {
    function_count: totalFunctionCount,
  });

  logger.info("Repository parsing completed", {
    repo_id: repoId,
  });
};
